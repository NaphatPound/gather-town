import React, { useState, useEffect, useRef } from "react";
import { networkService } from "../../../core/network/NetworkService";

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
}

interface ChatBoxProps {
    playerName: string;
}

export default function ChatBox({ playerName }: ChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isHovered, setIsHovered] = useState(false);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (data: { id: string; text: string; sender: string }) => {
            setMessages((prev) => [...prev, data].slice(-50));
            setHasNewMessage(true);
            // Auto-clear the "new message" indicator after 3 seconds
            setTimeout(() => setHasNewMessage(false), 3000);
        };

        networkService.on("chat:message", handleMessage);
        return () => {
            networkService.off("chat:message", handleMessage);
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        networkService.sendMessage(inputValue.trim(), playerName);
        setInputValue("");
        const input = e.currentTarget.querySelector("input");
        if (input) input.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.stopPropagation();
        } else if (e.key === "Escape") {
            e.currentTarget.blur();
        }
    };

    return (
        <div
            className="fixed bottom-20 left-4 w-64 md:w-72 z-50 transition-all duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Collapsed state: just a small chat icon + indicator */}
            {!isHovered && (
                <div className="bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer border border-gray-700/50 shadow-lg">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs text-gray-300">Chat</span>
                    {hasNewMessage && (
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse ml-auto" />
                    )}
                    {messages.length > 0 && (
                        <span className="text-[10px] text-gray-500 ml-auto">{messages.length}</span>
                    )}
                </div>
            )}

            {/* Expanded state: full chatbox */}
            {isHovered && (
                <div className="bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden flex flex-col shadow-lg border border-gray-700/50"
                    style={{ maxHeight: "40vh" }}
                >
                    {/* Header */}
                    <div className="px-3 py-1.5 border-b border-gray-700/50 bg-black/40 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs text-gray-300 font-semibold">Chat</span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-gray-600" style={{ maxHeight: "25vh" }}>
                        {messages.length === 0 && (
                            <div className="text-[10px] text-gray-500 text-center py-4">No messages yet</div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={`${msg.id}-${i}`} className="text-xs text-white">
                                <span className={msg.sender === playerName ? "text-blue-400 font-bold" : "text-amber-400 font-bold"}>
                                    {msg.sender}:
                                </span>{" "}
                                <span className="break-words">{msg.text}</span>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700/50 bg-black/40">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="w-full bg-black/50 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 placeholder-gray-400"
                            maxLength={100}
                        />
                    </form>
                </div>
            )}
        </div>
    );
}
