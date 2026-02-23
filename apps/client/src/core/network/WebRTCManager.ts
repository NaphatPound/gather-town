import { networkService } from "./NetworkService";

interface RemoteMedia {
    stream: MediaStream;
    panner?: PannerNode;
    gain?: GainNode;
    videoElement?: HTMLVideoElement;
}

class WebRTCManager {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<string, RTCPeerConnection> = new Map();
    private remoteStreams: Map<string, RemoteMedia> = new Map();

    private audioContext: AudioContext | null = null;
    private localPannerX = 0;
    private localPannerY = 0;

    private onRemoteTrackAddedCallback?: (playerId: string, stream: MediaStream) => void;
    private onRemoteTrackRemovedCallback?: (playerId: string) => void;

    setup(onTrackAdded: (val: string, s: MediaStream) => void, onTrackRemoved: (val: string) => void) {
        this.onRemoteTrackAddedCallback = onTrackAdded;
        this.onRemoteTrackRemovedCallback = onTrackRemoved;

        networkService.on("webrtc-offer" as any, this.handleOffer.bind(this));
        networkService.on("webrtc-answer" as any, this.handleAnswer.bind(this));
        networkService.on("webrtc-ice-candidate" as any, this.handleIceCandidate.bind(this));
        networkService.on("player:left", this.handlePlayerLeft.bind(this));
    }

    async startLocalStream(audio: boolean, video: boolean) {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ audio, video });
            if (!this.localStream) {
                this.localStream = newStream;
            } else {
                // Merge new tracks into existing stream
                newStream.getTracks().forEach((track) => {
                    // Remove existing track of same kind if replacing
                    const existingTrack = this.localStream!.getTracks().find(t => t.kind === track.kind);
                    if (existingTrack) {
                        this.localStream!.removeTrack(existingTrack);
                        existingTrack.stop();
                    }
                    this.localStream!.addTrack(track);
                });
            }

            // Sync with existing peers
            this.updatePeersWithLocalStream();

            return this.localStream;
        } catch (e) {
            console.error("Failed to get local media", e);
            return null;
        }
    }

    private updatePeersWithLocalStream() {
        if (!this.localStream) return;

        for (const [id, pc] of this.peerConnections.entries()) {
            const senders = pc.getSenders();
            this.localStream.getTracks().forEach((track) => {
                const sender = senders.find(s => s.track && s.track.kind === track.kind);
                if (sender) {
                    sender.replaceTrack(track);
                } else {
                    pc.addTrack(track, this.localStream!);
                }
            });
            // If adding new tracks we might need renegotiation
            this.renegotiate(id, pc);
        }
    }

    private async renegotiate(targetId: string, pc: RTCPeerConnection) {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            networkService.safeEmit("webrtc-offer", { target: targetId, sdp: pc.localDescription });
        } catch (e) { console.error(e) }
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => t.stop());
            this.localStream = null;
        }
        // Also close to peers
        for (const [id, pc] of this.peerConnections.entries()) {
            pc.close();
        }
        this.peerConnections.clear();
        this.remoteStreams.clear();
    }

    toggleMicrophone(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach((track) => {
                track.enabled = enabled;
            });
        }
    }

    toggleVideo(enabled: boolean) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach((track) => {
                track.enabled = enabled;
            });
        }
    }

    // --- WebRTC Establishment ---

    async initiateCall(targetPlayerId: string) {
        if (this.peerConnections.has(targetPlayerId)) return;
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
                sdp: pc.localDescription
            });
        } catch (e) {
            console.error("Error creating offer", e);
        }
    }

    private createPeerConnection(targetId: string): RTCPeerConnection {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
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
            this.handleRemoteTrack(targetId, event.streams[0]);
        };

        this.peerConnections.set(targetId, pc);
        return pc;
    }

    private async handleOffer(data: { caller: string; sdp: any }) {
        console.log("Got WebRTC Offer from", data.caller);
        let pc = this.peerConnections.get(data.caller);
        if (!pc) {
            pc = this.createPeerConnection(data.caller);
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => {
                // Prevent adding duplicate tracks
                const senders = pc!.getSenders();
                if (!senders.find((s) => s.track === t)) {
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
        console.log("Got WebRTC Answer from", data.answerer);
        const pc = this.peerConnections.get(data.answerer);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        }
    }

    private async handleIceCandidate(data: { sender: string; candidate: any }) {
        const pc = this.peerConnections.get(data.sender);
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.error("Failed adding ICE candidate", e);
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
        if (this.onRemoteTrackRemovedCallback) {
            this.onRemoteTrackRemovedCallback(id);
        }
    }

    // --- Spatial Audio ---

    private handleRemoteTrack(playerId: string, stream: MediaStream) {
        if (this.remoteStreams.has(playerId)) return; // Already setup

        if (!this.audioContext && stream.getAudioTracks().length > 0) {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) { console.error(e) }
        }

        let panner: PannerNode | undefined;
        let gain: GainNode | undefined;

        // If audio context exists, hook up spatial node, otherwise rely on video element (fallback)
        if (this.audioContext && stream.getAudioTracks().length > 0) {
            try {
                // MediaStreamTrack -> SourceNode
                const source = this.audioContext.createMediaStreamSource(stream);
                panner = this.audioContext.createPanner();
                panner.panningModel = "HRTF";
                panner.distanceModel = "inverse";
                panner.refDistance = 100;
                panner.maxDistance = 1000;
                panner.rolloffFactor = 1.5;

                gain = this.audioContext.createGain();
                gain.gain.value = 1;

                source.connect(panner);
                panner.connect(gain);
                gain.connect(this.audioContext.destination);
            } catch (e) {
                console.error("Audio Context routing failed", e);
            }
        }

        this.remoteStreams.set(playerId, { stream, panner, gain });

        if (this.onRemoteTrackAddedCallback && stream.getVideoTracks().length > 0) {
            this.onRemoteTrackAddedCallback(playerId, stream);
        }
    }

    updateLocalListenerPosition(x: number, y: number) {
        this.localPannerX = x;
        this.localPannerY = y;
        if (this.audioContext) {
            // Note: using setPosition for simplicity mapping 2D layout to 3D Audio space
            this.audioContext.listener.setPosition(x, y, 0);
        }
    }

    updateRemotePlayerPosition(playerId: string, x: number, y: number) {
        const media = this.remoteStreams.get(playerId);
        if (media && media.panner) {
            media.panner.setPosition(x, y, 0);
        }
    }
}

export const webrtcManager = new WebRTCManager();
