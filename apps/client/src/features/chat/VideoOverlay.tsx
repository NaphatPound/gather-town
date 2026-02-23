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
        if (!localStream) {
            const stream = await webrtcManager.startLocalStream(!micEnabled, cameraEnabled);
            if (stream) setLocalStream(stream);
        } else {
            webrtcManager.toggleMicrophone(!micEnabled);
        }
        setMicEnabled(!micEnabled);
        connectToOthers();
    };

    const toggleCamera = async () => {
        if (!localStream) {
            const stream = await webrtcManager.startLocalStream(micEnabled, !cameraEnabled);
            if (stream) setLocalStream(stream);
        } else {
            webrtcManager.toggleVideo(!cameraEnabled);
        }
        setCameraEnabled(!cameraEnabled);
        connectToOthers();
    };

    const connectToOthers = () => {
        // When turning on media, try to establish connections to everyone we know
        // This could be optimized to only connect to nearby players
        networkService.safeEmit("request-players", {}); // Could add a ping to get all existing players if needed
        // In our implementation, since we rely on "players:existing" or "player:joined" from MainScene,
        // a simple robust approach for MVP is just calling initiateCall for existing remote players.
        // For now we assume they'll call us or we call them upon proximity.
        // Let's rely on everyone creating a connection when they turn on their video.
    };

    return (
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
            {/* Controls */}
            <div className="flex gap-2 pointer-events-auto bg-black/50 p-2 rounded justify-end">
                <button
                    onClick={toggleMic}
                    className={`px-3 py-1 rounded text-sm text-white font-bold transition-colors ${micEnabled ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                        }`}
                >
                    {micEnabled ? "Mic On" : "Mic Off"}
                </button>
                <button
                    onClick={toggleCamera}
                    className={`px-3 py-1 rounded text-sm text-white font-bold transition-colors ${cameraEnabled ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-500 hover:bg-gray-600"
                        }`}
                >
                    {cameraEnabled ? "Cam On" : "Cam Off"}
                </button>
            </div>

            {/* Local Video */}
            {cameraEnabled && (
                <div className="w-32 h-24 bg-gray-900 rounded overflow-hidden border-2 border-green-400 shadow-lg relative pointer-events-auto">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted // ALWAYS mute local video to prevent echo
                        className="w-full h-full object-cover transform -scale-x-100"
                    />
                    <div className="absolute bottom-0 left-0 text-[10px] bg-black/60 text-white px-1">
                        You
                    </div>
                </div>
            )}

            {/* Remote Videos */}
            <div className="flex flex-col gap-2 mt-2 pointer-events-auto max-h-[60vh] overflow-y-auto">
                {Array.from(remoteStreams.entries()).map(([playerId, stream]) => {
                    if (stream.getVideoTracks().length === 0) return null; // Only show if they have video
                    return <RemoteVideo key={playerId} playerId={playerId} stream={stream} />;
                })}
            </div>
        </div>
    );
};

// Helper component to manage remote video elements
const RemoteVideo: React.FC<{ playerId: string; stream: MediaStream }> = ({ playerId, stream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="w-32 h-24 bg-gray-800 rounded overflow-hidden border-2 border-blue-400 shadow-lg relative">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                // Audio is played through the audioContext spatial panner, so we MUTE the raw video element!
                // This is critical so we don't hear double audio.
                muted
                className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 text-[10px] bg-black/60 text-white px-1">
                Player {playerId.substring(0, 4)}
            </div>
        </div>
    );
};
