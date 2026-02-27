import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Send, MessageSquare } from "lucide-react";
import { useAppSelector } from "../redux/store";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

const Chat: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000";
    socketRef.current = io(socketUrl, {
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.emit("getChatHistory");

    socket.on("chatHistory", (history: Message[]) => {
      setMessages(history);
    });

    socket.on("newMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("userTyping", (data: { senderName: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUser(data.senderName);
      } else {
        setTypingUser(null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !socketRef.current) return;

    socketRef.current.emit("sendMessage", {
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName || ""}`.trim(),
      content: newMessage.trim(),
    });

    setNewMessage("");
    // Stop typing indicator immediately
    socketRef.current.emit("typing", {
      senderName: user.firstName,
      isTyping: false,
    });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socketRef.current || !user) return;

    socketRef.current.emit("typing", {
      senderName: user.firstName,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", {
        senderName: user.firstName,
        isTyping: false,
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-4 flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <MessageSquare className="text-white" size={20} />
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Global Chat</h2>
          <p className="text-indigo-100 text-xs font-medium">Connect with everyone</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] font-bold text-gray-500 mb-1 px-1 uppercase tracking-wider">
                {isMe ? "You" : msg.senderName}
              </span>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm shadow-sm transition-all hover:shadow-md ${isMe
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                  }`}
              >
                {msg.content}
              </div>
              <span className="text-[9px] text-gray-400 mt-1 px-1">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        {typingUser && (
          <div className="flex flex-col items-start animate-fade-in">
            <span className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
              {typingUser} is typing...
            </span>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
