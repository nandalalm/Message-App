import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Send, MessageSquare, ArrowLeftRight, ChevronDown } from "lucide-react";
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
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!socket) return;
    socket.emit("getChatHistory", { limit: 20, skip: 0 });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleChatHistory = (history: Message[]) => {
      if (history.length < 20) setHasMore(false);
      
      const updateData = () => {
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = history.filter(m => !existingIds.has(m.id));
          
          if (newMessages.length === 0) return prev;
          
          const combined = [...prev, ...newMessages].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          return combined.slice(-100);
        });
        setIsLoadingMore(false);
      };

      if (isLoadingMore) {
        // Enforce 1s delay for pagination load
        setTimeout(updateData, 1000);
      } else {
        updateData();
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          setTimeout(() => scrollToBottom("auto"), 100);
        }
      }
    };

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => {
        const updated = [...prev, message];
        return updated.slice(-100); // Maintain capped state in UI
      });
      setTimeout(() => scrollToBottom("smooth"), 100);
    };

    const handleUserTyping = (data: { senderName: string; isTyping: boolean }) => {
      setTypingUser(data.isTyping ? data.senderName : null);
    };

    socket.on("chatHistory", handleChatHistory);
    socket.on("newMessage", handleNewMessage);
    socket.on("userTyping", handleUserTyping);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("newMessage", handleNewMessage);
      socket.off("userTyping", handleUserTyping);
    };
  }, [socket, isLoadingMore]);

  useEffect(() => {
    if (messagesContainerRef.current && prevScrollHeightRef.current > 0) {
      const { scrollHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTop = scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [messages]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    // Load more
    if (scrollTop === 0 && hasMore && !isLoadingMore && socket && messages.length > 0) {
      setIsLoadingMore(true);
      prevScrollHeightRef.current = scrollHeight;
      socket.emit("getChatHistory", { limit: 20, skip: messages.length });
    }

    // Show/hide scroll button
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    setShowScrollButton(!isNearBottom && messages.length > 5);
  };

  useEffect(() => {
    if (typingUser) {
      scrollToBottom();
    }
  }, [typingUser]);

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
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-4 flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <MessageSquare className="text-white" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-lg max-sm:text-sm truncate">Global Chat</h2>
          <p className="text-indigo-100 text-xs font-medium max-sm:text-[9px] truncate">Connect with everyone</p>
        </div>
        {showSwitch && (
          <button
            onClick={onSwitch}
            className="flex items-center gap-2 px-3 py-1.5 max-sm:px-2 max-sm:py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[10px] max-sm:text-[9px] font-black uppercase tracking-wider transition-all border border-white/10 shrink-0"
          >
            <ArrowLeftRight size={14} className="max-sm:w-3 max-sm:h-3" />
            <span className="max-sm:hidden">Switch to </span>Polls
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 scrollbar-hide"
      >
        {isLoadingMore && (
          <div className="flex flex-col items-center justify-center py-2 animate-fade-in">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-1" />
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                <span className={`text-[11px] max-sm:text-[10px] font-black uppercase tracking-tighter ${isMe ? "text-indigo-600" : "text-amber-600"
                  }`}>
                  {isMe ? "YOU" : msg.senderName}
                </span>
                <span className="text-[9px] max-sm:text-[8px] text-gray-400 font-medium">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div
                className={`max-w-[80%] max-sm:max-w-[85%] px-4 py-2 max-sm:px-3 max-sm:py-1.5 rounded-2xl text-[13px] max-sm:text-[12px] leading-relaxed shadow-sm transition-all border break-words whitespace-pre-wrap ${isMe
                  ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-none ml-12 max-sm:ml-8"
                  : "bg-white text-gray-800 border-gray-100 rounded-tl-none mr-12 max-sm:mr-8"
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

      {/* Floating Scroll Button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-[85px] right-4 p-2.5 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all animate-bounce z-20 border-2 border-white/20"
          title="Scroll to latest"
        >
          <ChevronDown size={18} />
        </button>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 max-sm:px-3 max-sm:py-2 bg-gray-100 border-none rounded-xl text-sm max-sm:text-xs focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
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
