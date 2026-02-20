import React, { useState, useEffect, useRef } from "react";
import { networkService } from "../../../core/network/NetworkService";

interface ChatMessage {
    id: string; // socket id, or unique id
    sender: string;
    text: string;
}

interface ChatBoxProps {
    playerName: string;
}

export default function ChatBox({ playerName }: ChatBoxProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMessage = (data: { id: string; text: string; sender: string }) => {
            setMessages((prev) => [...prev, data].slice(-50)); // Keep last 50 messages
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

        // Blur the input within the form
        const input = e.currentTarget.querySelector("input");
        if (input) input.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.stopPropagation(); // prevent triggering Phaser interactions if any
        } else if (e.key === "Escape") {
            e.currentTarget.blur();
        }
    };

    return (
        <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-64 md:w-80 bg-black/80 rounded-lg overflow-hidden flex flex-col shadow-lg border border-gray-700/50 z-50`}
            style={{ maxHeight: "30%" }}
        >
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-gray-600">
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

            <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700/50 bg-black/40">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder="Press Enter to chat..."
                    className="w-full bg-black/50 text-white text-sm outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 placeholder-gray-400"
                    maxLength={100}
                />
            </form>
        </div>
    );
}
