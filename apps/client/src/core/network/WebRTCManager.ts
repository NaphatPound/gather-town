import { networkService } from "./NetworkService";

interface RemoteMedia {
    stream: MediaStream;
    panner?: PannerNode;
    gain?: GainNode;
    sourceNode?: MediaStreamAudioSourceNode;
    analyser?: AnalyserNode;
}

class WebRTCManager {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private remoteStreams: Map<string, RemoteMedia> = new Map();

    private audioContext: AudioContext | null = null;
    private localPannerX = 0;
    private localPannerY = 0;

    private onRemoteStreamCallback?: (playerId: string, stream: MediaStream) => void;
    private onRemoteRemovedCallback?: (playerId: string) => void;
    private onSpeakingCallback?: (playerId: string, isSpeaking: boolean) => void;
    private isSetup = false;
    private playerNames: Map<string, string> = new Map();
    private speakingStates: Map<string, boolean> = new Map();
    private vadIntervalId: number | null = null;

    // ---------- Setup ----------

    setup(
        onStreamAdded: (playerId: string, stream: MediaStream) => void,
        onStreamRemoved: (playerId: string) => void,
        onSpeaking?: (playerId: string, isSpeaking: boolean) => void
    ) {
        if (this.isSetup) return;
        this.isSetup = true;

        this.onRemoteStreamCallback = onStreamAdded;
        this.onRemoteRemovedCallback = onStreamRemoved;
        this.onSpeakingCallback = onSpeaking;

        // Signaling events
        networkService.on("webrtc-offer" as any, this.handleOffer.bind(this));
        networkService.on("webrtc-answer" as any, this.handleAnswer.bind(this));
        networkService.on("webrtc-ice-candidate" as any, this.handleIceCandidate.bind(this));
        networkService.on("player:left", this.handlePlayerLeft.bind(this));

        // When we get a list of players, try to call each one
        networkService.on("players:existing" as any, this.handlePlayersExisting.bind(this));

        // When a new player joins, if we have media, initiate a call to them
        networkService.on("player:joined" as any, this.handlePlayerJoined.bind(this));

        // Start voice activity detection loop
        this.startVADLoop();
    }

    getPlayerName(playerId: string): string {
        return this.playerNames.get(playerId) || playerId.substring(0, 6);
    }

    // ---------- Local Media ----------

    async startLocalStream(audio: boolean, video: boolean): Promise<MediaStream | null> {
        try {
            const constraints: MediaStreamConstraints = {};
            if (audio) constraints.audio = true;
            if (video) constraints.video = true;
            if (!audio && !video) return this.localStream;

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);

            if (!this.localStream) {
                this.localStream = new MediaStream();
            }

            // Merge new tracks into the single localStream
            newStream.getTracks().forEach((track) => {
                const old = this.localStream!.getTracks().find(t => t.kind === track.kind);
                if (old) {
                    this.localStream!.removeTrack(old);
                    old.stop();
                }
                this.localStream!.addTrack(track);
            });

            // Push tracks to all existing peer connections
            this.syncTracksToAllPeers();

            return this.localStream;
        } catch (e: any) {
            console.error("[WebRTC] Failed to get local media", e);
            // Show user-friendly error
            const msg = e?.name === "NotAllowedError"
                ? "Camera/Mic permission denied. Please allow access in your browser settings."
                : e?.name === "NotFoundError"
                    ? "No camera or microphone found on this device."
                    : navigator.mediaDevices
                        ? `Failed to access camera/mic: ${e?.message || "Unknown error"}`
                        : "Camera/Mic requires HTTPS. Please access the site via https:// or localhost.";
            alert(msg);
            return null;
        }
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => t.stop());
            this.localStream = null;
        }
        for (const [, pc] of this.peerConnections) {
            pc.close();
        }
        this.peerConnections.clear();
        this.remoteStreams.clear();
    }

    toggleMicrophone(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((t) => { t.enabled = enabled; });
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            if (!enabled) {
                // Fully stop and remove video tracks so remote side sees them disappear
                this.localStream.getVideoTracks().forEach((t) => {
                    t.stop();
                    this.localStream!.removeTrack(t);
                });
                // Remove video senders from all peer connections and renegotiate
                for (const [id, pc] of this.peerConnections) {
                    const senders = pc.getSenders();
                    senders.forEach(s => {
                        if (s.track?.kind === "video") {
                            pc.removeTrack(s);
                        }
                    });
                    this.renegotiate(id, pc);
                }
            } else {
                this.localStream.getVideoTracks().forEach((t) => { t.enabled = true; });
            }
        }
    }

    // ---------- Peer Sync ----------

    private syncTracksToAllPeers() {
        if (!this.localStream) return;
        for (const [id, pc] of this.peerConnections) {
            const senders = pc.getSenders();
            this.localStream.getTracks().forEach((track) => {
                const existingSender = senders.find(s => s.track?.kind === track.kind);
                if (existingSender) {
                    existingSender.replaceTrack(track);
                } else {
                    pc.addTrack(track, this.localStream!);
                }
            });
            // Renegotiate so the remote side knows about new tracks
            this.renegotiate(id, pc);
        }
    }

    private async renegotiate(targetId: string, pc: RTCPeerConnection) {
        // Only renegotiate when in stable state — prevents race conditions
        if (pc.signalingState !== "stable") {
            console.warn(`[WebRTC] Skipping renegotiation to ${targetId}, state: ${pc.signalingState}`);
            return;
        }
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            networkService.safeEmit("webrtc-offer", {
                target: targetId,
                sdp: pc.localDescription,
            });
        } catch (e) {
            console.error("[WebRTC] Renegotiation error", e);
        }
    }

    // ---------- Call Management ----------

    /** When we get the player list, initiate calls and track names */
    private handlePlayersExisting(players: Array<{ id: string; name?: string }>) {
        // Track names
        for (const p of players) {
            if (p.name) this.playerNames.set(p.id, p.name);
        }
        if (!this.localStream) return;
        for (const p of players) {
            if (p.id !== networkService.id) {
                this.initiateCall(p.id);
            }
        }
    }

    /** When a new player joins the room, track name and call them */
    private handlePlayerJoined(data: { id: string; name?: string }) {
        if (data.name) this.playerNames.set(data.id, data.name);
        if (!this.localStream) return;
        setTimeout(() => {
            this.initiateCall(data.id);
        }, 1000);
    }

    async initiateCall(targetPlayerId: string) {
        // If we already have a connection, skip — syncTracksToAllPeers handles updates
        if (this.peerConnections.has(targetPlayerId)) {
            return;
        }

        console.log("[WebRTC] Initiating call to", targetPlayerId);
        const pc = this.createPeerConnection(targetPlayerId);

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.localStream!);
            });
        }

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            networkService.safeEmit("webrtc-offer", {
                target: targetPlayerId,
                sdp: pc.localDescription,
            });
        } catch (e) {
            console.error("[WebRTC] Error creating offer", e);
        }
    }

    private createPeerConnection(targetId: string): RTCPeerConnection {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" },
            ],
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                networkService.safeEmit("webrtc-ice-candidate", {
                    target: targetId,
                    candidate: event.candidate,
                });
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams?.[0];
            if (stream) {
                this.handleRemoteTrack(targetId, stream);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Connection to ${targetId}: ${pc.connectionState}`);
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                // Clean up failed connections so they can be re-established
                this.closeConnection(targetId);
            }
        };

        this.peerConnections.set(targetId, pc);
        return pc;
    }

    // ---------- Signaling Handlers ----------

    private async handleOffer(data: { caller: string; sdp: any }) {
        console.log("[WebRTC] Got offer from", data.caller);
        let pc = this.peerConnections.get(data.caller);

        if (pc) {
            // Renegotiation on existing connection
            // Need to handle "glare" — if we're in "have-local-offer" state, rollback first
            if (pc.signalingState === "have-local-offer") {
                // Polite peer: rollback our own offer
                await pc.setLocalDescription({ type: "rollback" } as RTCSessionDescriptionInit);
            }
        } else {
            pc = this.createPeerConnection(data.caller);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        // Add our local tracks if not already added
        if (this.localStream) {
            const senders = pc.getSenders();
            this.localStream.getTracks().forEach((t) => {
                const alreadySending = senders.find((s) => s.track?.kind === t.kind);
                if (!alreadySending) {
                    pc!.addTrack(t, this.localStream!);
                }
            });
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        networkService.safeEmit("webrtc-answer", {
            target: data.caller,
            sdp: pc.localDescription,
        });
    }

    private async handleAnswer(data: { answerer: string; sdp: any }) {
        console.log("[WebRTC] Got answer from", data.answerer);
        const pc = this.peerConnections.get(data.answerer);
        if (pc) {
            // Only set remote description if we're in the right state
            if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else {
                console.warn("[WebRTC] Ignoring answer in state:", pc.signalingState);
            }
        }
    }

    private async handleIceCandidate(data: { sender: string; candidate: any }) {
        const pc = this.peerConnections.get(data.sender);
        if (pc && data.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error("[WebRTC] Failed adding ICE candidate", e);
            }
        }
    }

    private handlePlayerLeft(data: { id: string }) {
        this.closeConnection(data.id);
    }

    private closeConnection(id: string) {
        const pc = this.peerConnections.get(id);
        if (pc) {
            pc.close();
            this.peerConnections.delete(id);
        }
        this.remoteStreams.delete(id);
        if (this.onRemoteRemovedCallback) {
            this.onRemoteRemovedCallback(id);
        }
    }

    // ---------- Spatial Audio ----------

    private ensureAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("[WebRTC] AudioContext creation failed", e);
            }
        }
        if (this.audioContext?.state === "suspended") {
            this.audioContext.resume();
        }
    }

    private handleRemoteTrack(playerId: string, stream: MediaStream) {
        this.ensureAudioContext();

        // If we already have this player, update their stream & re-notify UI
        const existing = this.remoteStreams.get(playerId);
        if (existing) {
            existing.stream = stream;

            // Re-connect audio source if audio tracks changed
            if (this.audioContext && stream.getAudioTracks().length > 0 && !existing.sourceNode) {
                try {
                    const source = this.audioContext.createMediaStreamSource(stream);
                    const analyser = this.audioContext.createAnalyser();
                    analyser.fftSize = 512;
                    const panner = this.audioContext.createPanner();
                    panner.panningModel = "HRTF";
                    panner.distanceModel = "inverse";
                    panner.refDistance = 100;
                    panner.maxDistance = 1000;
                    panner.rolloffFactor = 1.5;

                    const gain = this.audioContext.createGain();
                    gain.gain.value = 1;

                    source.connect(analyser);
                    analyser.connect(panner);
                    panner.connect(gain);
                    gain.connect(this.audioContext.destination);

                    existing.sourceNode = source;
                    existing.analyser = analyser;
                    existing.panner = panner;
                    existing.gain = gain;
                } catch (e) {
                    console.error("[WebRTC] Audio re-routing failed", e);
                }
            }

            if (this.onRemoteStreamCallback) {
                this.onRemoteStreamCallback(playerId, stream);
            }
            return;
        }

        // Brand new remote player
        let panner: PannerNode | undefined;
        let gain: GainNode | undefined;
        let sourceNode: MediaStreamAudioSourceNode | undefined;
        let analyser: AnalyserNode | undefined;

        if (this.audioContext && stream.getAudioTracks().length > 0) {
            try {
                sourceNode = this.audioContext.createMediaStreamSource(stream);
                analyser = this.audioContext.createAnalyser();
                analyser.fftSize = 512;
                panner = this.audioContext.createPanner();
                panner.panningModel = "HRTF";
                panner.distanceModel = "inverse";
                panner.refDistance = 100;
                panner.maxDistance = 1000;
                panner.rolloffFactor = 1.5;

                gain = this.audioContext.createGain();
                gain.gain.value = 1;

                sourceNode.connect(analyser);
                analyser.connect(panner);
                panner.connect(gain);
                gain.connect(this.audioContext.destination);
            } catch (e) {
                console.error("[WebRTC] Audio routing failed", e);
            }
        }

        this.remoteStreams.set(playerId, { stream, panner, gain, sourceNode, analyser });

        // Always notify UI
        if (this.onRemoteStreamCallback) {
            this.onRemoteStreamCallback(playerId, stream);
        }
    }

    updateLocalListenerPosition(x: number, y: number) {
        this.localPannerX = x;
        this.localPannerY = y;
        if (this.audioContext) {
            this.audioContext.listener.setPosition(x, y, 0);
        }
    }

    updateRemotePlayerPosition(playerId: string, x: number, y: number) {
        const media = this.remoteStreams.get(playerId);
        if (media?.panner) {
            media.panner.setPosition(x, y, 0);
        }
    }

    // ---------- Voice Activity Detection ----------

    private startVADLoop() {
        if (this.vadIntervalId) return;
        this.vadIntervalId = window.setInterval(() => {
            for (const [playerId, media] of this.remoteStreams) {
                if (!media.analyser) continue;
                const dataArray = new Uint8Array(media.analyser.fftSize);
                media.analyser.getByteTimeDomainData(dataArray);

                // Calculate RMS level
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const v = (dataArray[i] - 128) / 128;
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / dataArray.length);
                const isSpeaking = rms > 0.02; // threshold

                const prev = this.speakingStates.get(playerId) || false;
                if (isSpeaking !== prev) {
                    this.speakingStates.set(playerId, isSpeaking);
                    if (this.onSpeakingCallback) {
                        this.onSpeakingCallback(playerId, isSpeaking);
                    }
                    // Also dispatch a custom event so Phaser scene can listen
                    window.dispatchEvent(new CustomEvent("webrtc-speaking", {
                        detail: { playerId, isSpeaking }
                    }));
                }
            }
        }, 150); // Check every 150ms
    }
}

export const webrtcManager = new WebRTCManager();
