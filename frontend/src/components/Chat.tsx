import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Send, MessageSquare } from "lucide-react";
import { useAppSelector } from "../redux/store";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface ChatProps {
  socket: Socket | null;
  onSwitch?: () => void;
  showSwitch?: boolean;
}

const Chat: React.FC<ChatProps> = ({ socket, onSwitch, showSwitch }) => {
  const { user } = useAppSelector((state) => state.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!socket) return;

    socket.emit("getChatHistory");

    const handleChatHistory = (history: Message[]) => {
      setMessages(history);
    };

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleUserTyping = (data: { senderName: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setTypingUser(data.senderName);
      } else {
        setTypingUser(null);
      }
    };

    socket.on("chatHistory", handleChatHistory);
    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleUserTyping);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleUserTyping);
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !socket) return;

    const messageData = {
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName || ""}`.trim(),
      content: newMessage.trim(),
    };

    socket.emit("sendMessage", messageData);

    setNewMessage("");
    socket.emit("typing", {
      senderName: user.firstName,
      isTyping: false,
    });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!socket || !user) return;

    socket.emit("typing", {
      senderName: user.firstName,
      isTyping: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("typing", {
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
        <div className="flex-1">
          <h2 className="text-white font-bold text-lg">Global Chat</h2>
          <p className="text-indigo-100 text-xs font-medium">Connect with everyone</p>
        </div>
        {showSwitch && (
          <button
            onClick={onSwitch}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[10px] font-black uppercase tracking-wider transition-all border border-white/10"
          >
            Switch to Polls
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <span className={`text-[11px] font-black uppercase tracking-tighter ${isMe ? "text-indigo-600" : "text-amber-600"
                  }`}>
                  {isMe ? "YOU" : msg.senderName}
                </span>
                <span className="text-[9px] text-gray-400 font-medium">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div
                className={`max-w-[90%] px-4 py-2 rounded-xl text-[13px] leading-relaxed shadow-sm transition-all border ${isMe
                  ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-none"
                  : "bg-white text-gray-800 border-gray-100 rounded-tl-none"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        {typingUser && (
          <div className="flex flex-col items-start animate-pulse">
            <span className="text-[10px] font-black text-amber-500 mb-1 px-1 uppercase italic tracking-widest">
              {typingUser} IS TYPING...
            </span>
            <div className="px-3 py-2 bg-white/50 rounded-lg flex gap-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
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
