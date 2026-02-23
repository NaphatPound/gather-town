import React, { useEffect, useRef, useState } from "react";
import { webrtcManager } from "../../core/network/WebRTCManager";
import { networkService } from "../../core/network/NetworkService";

export const VideoOverlay: React.FC = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [micEnabled, setMicEnabled] = useState(false);
    const [cameraEnabled, setCameraEnabled] = useState(false);

    const localVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // We register the callbacks to receive remote streams
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

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const toggleMic = async () => {
        let stream = localStream;
        if (!stream && !micEnabled) {
            stream = await webrtcManager.startLocalStream(true, cameraEnabled);
            if (stream) setLocalStream(stream);
        } else if (stream && !micEnabled) {
            // Already has stream (e.g. camera), just add audio
            stream = await webrtcManager.startLocalStream(true, cameraEnabled);
        } else {
            webrtcManager.toggleMicrophone(false);
        }
        setMicEnabled(!micEnabled);
        connectToOthers();
    };

    const toggleCamera = async () => {
        let stream = localStream;
        if (!stream && !cameraEnabled) {
            stream = await webrtcManager.startLocalStream(micEnabled, true);
            if (stream) setLocalStream(stream);
        } else if (stream && !cameraEnabled) {
            // Already has stream (e.g. mic), just add video
            stream = await webrtcManager.startLocalStream(micEnabled, true);
        } else {
            webrtcManager.toggleVideo(false);
        }
        setCameraEnabled(!cameraEnabled);
        connectToOthers();
    };

    const connectToOthers = () => {
        networkService.safeEmit("request-players", {});
    };

    return (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl pointer-events-none flex flex-col z-50">
            {/* Remote Videos Grid Mode */}
            <div className="flex flex-wrap gap-4 justify-center pointer-events-auto max-h-[70vh] overflow-y-auto w-full p-4">
                {cameraEnabled && (
                    <div className="w-80 h-60 bg-gray-900 rounded-xl overflow-hidden border-2 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.2)] relative flex-shrink-0">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                        />
                        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/70 rounded-md px-2 py-1 text-white text-xs">
                            <span className="font-semibold">You</span>
                            {!micEnabled && <span className="text-red-400 font-bold">Muted</span>}
                        </div>
                    </div>
                )}

                {Array.from(remoteStreams.entries()).map(([playerId, stream]) => {
                    const hasVideo = stream.getVideoTracks().some(t => t.enabled);
                    // if (!hasVideo) return null; // We can show a placeholder if no video, but let's show only active cameras for Discord style grid
                    return <RemoteVideo key={playerId} playerId={playerId} stream={stream} hasVideo={hasVideo} />;
                })}
            </div>

            {/* Bottom Controls Panel */}
            <div className="absolute top-[80vh] left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/90 backdrop-blur-md px-6 py-3 rounded-full pointer-events-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-gray-700">
                <button
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micEnabled ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                >
                    {micEnabled ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M12 14c-1.657 0-3-1.343-3-3V8m10.12 3a7.002 7.002 0 01-14.24 0M12 19.5v2.5M9 22h6" /></svg>
                    )}
                </button>
                <button
                    onClick={toggleCamera}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${cameraEnabled ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]" : "bg-gray-700 hover:bg-gray-600 text-white"
                        }`}
                >
                    {cameraEnabled ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18M15 15l-3-3m0 0l-3-3m3 3V8m4 4l3 3m-3-3h3m-3 0h-3" /></svg>
                    )}
                </button>
            </div>
        </div>
    );
};

// Helper component to manage remote video elements
const RemoteVideo: React.FC<{ playerId: string; stream: MediaStream; hasVideo: boolean }> = ({ playerId, stream, hasVideo }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    if (!hasVideo) return null; // Can render a placeholder here if needed

    return (
        <div className="w-80 h-60 bg-gray-800 rounded-xl overflow-hidden border-2 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)] relative flex-shrink-0 transition-all duration-300">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 rounded-md px-2 py-1 text-white text-xs">
                Player {playerId.substring(0, 4)}
            </div>
        </div>
    );
};
