import React, { useEffect, useRef, useState } from "react";
import { webrtcManager } from "../../core/network/WebRTCManager";
import { networkService } from "../../core/network/NetworkService";

export const VideoOverlay: React.FC = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    // ---- Setup callbacks once ----
    useEffect(() => {
        webrtcManager.setup(
            (playerId, stream) => {
                setRemoteStreams((prev) => {
                    const next = new Map(prev);
                    next.set(playerId, stream);
                    return next;
                });
            },
            (playerId) => {
                setRemoteStreams((prev) => {
                    const next = new Map(prev);
                    next.delete(playerId);
                    return next;
                });
            }
        );
        return () => {
            webrtcManager.stopLocalStream();
        };
    }, []);

    // ---- Sync local video element ----
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, cameraEnabled]);

    // ---- Toggle Mic ----
    const toggleMic = async () => {
        const wantOn = !micEnabled;
        if (wantOn) {
            // Acquire audio (keep existing video if any)
            const stream = await webrtcManager.startLocalStream(true, cameraEnabled);
            if (stream) setLocalStream(stream);
        } else {
            webrtcManager.toggleMicrophone(false);
        }
        setMicEnabled(wantOn);

        // Request player list so WebRTCManager can initiate calls
        networkService.safeEmit("request-players", {});
    };

    // ---- Toggle Camera ----
    const toggleCamera = async () => {
        const wantOn = !cameraEnabled;
        if (wantOn) {
            // Acquire video (keep existing audio if any)
            const stream = await webrtcManager.startLocalStream(micEnabled, true);
            if (stream) setLocalStream(stream);
        } else {
            webrtcManager.toggleVideo(false);
        }
        setCameraEnabled(wantOn);

        // Request player list so WebRTCManager can initiate calls
        networkService.safeEmit("request-players", {});
    };

    return (
        <>
            {/* ===== Gather Town Style: Small floating video bubbles (top-left) ===== */}
            <div className="fixed top-20 left-4 flex flex-col gap-3 z-50 pointer-events-none">
                {/* Local camera bubble */}
                {cameraEnabled && (
                    <div className="w-36 h-28 bg-gray-900 rounded-2xl overflow-hidden border-2 border-green-400 shadow-[0_4px_20px_rgba(74,222,128,0.3)] relative pointer-events-auto">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                        />
                        <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/70 rounded-md px-1.5 py-0.5 text-white text-[10px]">
                            <span className="font-semibold">You</span>
                            {!micEnabled && (
                                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            )}
                        </div>
                    </div>
                )}

                {/* Remote camera / audio-only bubbles */}
                {Array.from(remoteStreams.entries()).map(([playerId, stream]) => (
                    <RemotePlayerBubble key={playerId} playerId={playerId} stream={stream} />
                ))}
            </div>

            {/* ===== Bottom control dock ===== */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-gray-700/60 pointer-events-auto">
                {/* Mic button */}
                <button
                    onClick={toggleMic}
                    title={micEnabled ? "Mute microphone" : "Unmute microphone"}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${micEnabled
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                >
                    {micEnabled ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                    )}
                </button>

                {/* Camera button */}
                <button
                    onClick={toggleCamera}
                    title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${cameraEnabled
                        ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                        : "bg-gray-700 hover:bg-gray-600 text-white"
                        }`}
                >
                    {cameraEnabled ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
            </div>
        </>
    );
};

// ---- Remote Player Bubble ----

const RemotePlayerBubble: React.FC<{ playerId: string; stream: MediaStream }> = ({ playerId, stream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasVideo = stream.getVideoTracks().some(t => t.enabled);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // If no video, show an audio-only indicator (like Gather Town)
    if (!hasVideo) {
        return (
            <div className="w-36 h-28 bg-gray-800 rounded-2xl border-2 border-indigo-400/60 shadow-lg flex flex-col items-center justify-center pointer-events-auto">
                <svg className="w-8 h-8 text-indigo-300 mb-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                <span className="text-[10px] text-gray-300">{playerId.substring(0, 6)}</span>
            </div>
        );
    }

    return (
        <div className="w-36 h-28 bg-gray-800 rounded-2xl overflow-hidden border-2 border-blue-400 shadow-[0_4px_20px_rgba(96,165,250,0.2)] relative pointer-events-auto">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted  // Audio goes through Web Audio API spatial panner
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 left-1 bg-black/70 rounded-md px-1.5 py-0.5 text-white text-[10px]">
                {playerId.substring(0, 6)}
            </div>
        </div>
    );
};
