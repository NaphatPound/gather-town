import { networkService } from "./NetworkService";

interface RemoteMedia {
    stream: MediaStream;
    panner?: PannerNode;
    gain?: GainNode;
    sourceNode?: MediaStreamAudioSourceNode;
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
    private isSetup = false;

    // ---------- Setup ----------

    setup(
        onStreamAdded: (playerId: string, stream: MediaStream) => void,
        onStreamRemoved: (playerId: string) => void
    ) {
        if (this.isSetup) return;
        this.isSetup = true;

        this.onRemoteStreamCallback = onStreamAdded;
        this.onRemoteRemovedCallback = onStreamRemoved;

        // Signaling events
        networkService.on("webrtc-offer" as any, this.handleOffer.bind(this));
        networkService.on("webrtc-answer" as any, this.handleAnswer.bind(this));
        networkService.on("webrtc-ice-candidate" as any, this.handleIceCandidate.bind(this));
        networkService.on("player:left", this.handlePlayerLeft.bind(this));

        // When we get a list of players, try to call each one
        networkService.on("players:existing" as any, this.handlePlayersExisting.bind(this));

        // When a new player joins, if we have media, initiate a call to them
        networkService.on("player:joined" as any, this.handlePlayerJoined.bind(this));
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
        } catch (e) {
            console.error("[WebRTC] Failed to get local media", e);
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
            this.localStream.getVideoTracks().forEach((t) => { t.enabled = enabled; });
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

    /** When we get the player list, initiate calls to everyone */
    private handlePlayersExisting(players: Array<{ id: string }>) {
        if (!this.localStream) return;
        for (const p of players) {
            if (p.id !== networkService.id) {
                this.initiateCall(p.id);
            }
        }
    }

    /** When a new player joins the room, we proactively call them if we have media */
    private handlePlayerJoined(data: { id: string }) {
        if (!this.localStream) return;
        // Small delay so the new player's UI is ready
        setTimeout(() => {
            this.initiateCall(data.id);
        }, 1000);
    }

    async initiateCall(targetPlayerId: string) {
        // If we already have a connection, just sync tracks and renegotiate
        if (this.peerConnections.has(targetPlayerId)) {
            if (this.localStream) {
                const pc = this.peerConnections.get(targetPlayerId)!;
                const senders = pc.getSenders();
                this.localStream.getTracks().forEach((track) => {
                    const existing = senders.find(s => s.track?.kind === track.kind);
                    if (existing) {
                        existing.replaceTrack(track);
                    } else {
                        pc.addTrack(track, this.localStream!);
                    }
                });
                this.renegotiate(targetPlayerId, pc);
            }
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
                    const panner = this.audioContext.createPanner();
                    panner.panningModel = "HRTF";
                    panner.distanceModel = "inverse";
                    panner.refDistance = 100;
                    panner.maxDistance = 1000;
                    panner.rolloffFactor = 1.5;

                    const gain = this.audioContext.createGain();
                    gain.gain.value = 1;

                    source.connect(panner);
                    panner.connect(gain);
                    gain.connect(this.audioContext.destination);

                    existing.sourceNode = source;
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

        if (this.audioContext && stream.getAudioTracks().length > 0) {
            try {
                sourceNode = this.audioContext.createMediaStreamSource(stream);
                panner = this.audioContext.createPanner();
                panner.panningModel = "HRTF";
                panner.distanceModel = "inverse";
                panner.refDistance = 100;
                panner.maxDistance = 1000;
                panner.rolloffFactor = 1.5;

                gain = this.audioContext.createGain();
                gain.gain.value = 1;

                sourceNode.connect(panner);
                panner.connect(gain);
                gain.connect(this.audioContext.destination);
            } catch (e) {
                console.error("[WebRTC] Audio routing failed", e);
            }
        }

        this.remoteStreams.set(playerId, { stream, panner, gain, sourceNode });

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
}

export const webrtcManager = new WebRTCManager();
