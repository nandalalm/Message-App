import React, { useState, useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { Send, MessageSquare, ArrowLeftRight, ChevronDown, Edit2, Trash2, X, Image as ImageIcon, Maximize2 } from "lucide-react";
import { useAppSelector } from "../redux/store";
import { ImageApi } from "../services/imageApi";
import { useToast } from "../hooks/useToast";
import ConfirmDialog from "./ConfirmDialog";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  editCount: number;
  imageUrl?: string;
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
  
  // Modals and Dialogs state
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [localImageMessage, setLocalImageMessage] = useState<{ id: string; senderId: string; senderName: string; imageUrl: string | null; createdAt: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { show } = useToast();
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
        return updated.slice(-100);
      });
      setTimeout(() => scrollToBottom("smooth"), 100);
    };

    const handleMessageEdited = (updatedMessage: Message) => {
      setMessages((prev) => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
    };

    const handleMessageDeleted = (deletedMessage: Message) => {
      setMessages((prev) => prev.map(m => m.id === deletedMessage.id ? deletedMessage : m));
    };

    const handleUserTyping = (data: { senderName: string; isTyping: boolean }) => {
      setTypingUser(data.isTyping ? data.senderName : null);
    };

    socket.on("chatHistory", handleChatHistory);
    socket.on("newMessage", handleNewMessage);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("userTyping", handleUserTyping);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
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
    if (scrollTop === 0 && hasMore && !isLoadingMore && socket && messages.length > 0) {
      setIsLoadingMore(true);
      prevScrollHeightRef.current = scrollHeight;
      socket.emit("getChatHistory", { limit: 20, skip: messages.length });
    }
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 300;
    setShowScrollButton(!isNearBottom && messages.length > 5);
  };

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
    socket.emit("typing", { senderName: user.firstName, isTyping: false });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !socket) return;

    if (!file.type.startsWith("image/")) {
      show("Only image files are allowed!", "error");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);

    try {
      setImageUploading(true);
      setLocalImageMessage({
        id: tempId,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName || ""}`.trim(),
        imageUrl: previewUrl,
        createdAt: new Date().toISOString(),
      });
      
      const results = await ImageApi.uploadImages([{ file }]);
      if (results.length > 0) {
        const messageData = {
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName || ""}`.trim(),
          content: "Sent an image",
          imageUrl: results[0].url,
          s3Key: results[0].id
        };
        socket.emit("sendMessage", messageData);
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      show("Failed to upload image.", "error");
    } finally {
      setImageUploading(false);
      setLocalImageMessage(null);
      URL.revokeObjectURL(previewUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageToEdit || !editContent.trim() || !user || !socket) return;

    socket.emit("editMessage", {
      userId: user.id,
      messageId: messageToEdit.id,
      content: editContent.trim(),
    });

    setMessageToEdit(null);
    setEditContent("");
  };

  const confirmDelete = () => {
    if (!messageToDeleteId || !user || !socket) return;
    socket.emit("deleteMessage", {
      userId: user.id,
      messageId: messageToDeleteId,
    });
    setMessageToDeleteId(null);
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
          <button onClick={onSwitch} className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-[10px] font-black uppercase tracking-wider transition-all border border-white/10 shrink-0">
            <ArrowLeftRight size={14} />
            <span className="max-sm:hidden">Switch to </span>Polls
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 scrollbar-hide">
        {isLoadingMore && (
          <div className="flex justify-center py-2"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} group relative`}>
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isMe ? "text-indigo-600" : "text-gray-600"}`}>{isMe ? "YOU" : msg.senderName}</span>
                <span className="text-[9px] text-gray-400 font-medium">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.isEdited && !msg.isDeleted && <span className="text-[9px] text-gray-400 italic bg-gray-100 px-1 rounded">edited</span>}
              </div>

              <div className="flex items-center gap-2 max-w-[85%]">
                {isMe && !msg.isDeleted && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 mr-1 shrink-0">
                    {!msg.imageUrl && msg.editCount === 0 && (
                      <button 
                        onClick={() => { setMessageToEdit(msg); setEditContent(msg.content); }} 
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Edit message"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button 
                      onClick={() => setMessageToDeleteId(msg.id)} 
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete message"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm border relative overflow-hidden ${
                  msg.isDeleted ? "bg-gray-100 text-gray-400 border-gray-200 italic font-medium" : 
                  isMe ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-none" : "bg-slate-100 text-slate-800 border-slate-200 rounded-tl-none shadow-sm"
                }`}>
                  {msg.isDeleted ? (
                    "This message was deleted"
                  ) : (
                    <>
                      {msg.imageUrl && (
                        <div className="mb-2 relative group/img cursor-pointer" onClick={() => setPreviewImageUrl(msg.imageUrl || null)}>
                          <img 
                            src={msg.imageUrl} 
                            alt="Chat content" 
                            className="rounded-xl max-w-[200px] max-h-[200px] max-sm:max-w-[140px] max-sm:max-h-[140px] object-cover border border-black/5 hover:brightness-90 transition-all shadow-md" 
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/20 rounded-xl">
                            <Maximize2 size={24} className="text-white drop-shadow-md" />
                          </div>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {localImageMessage && (
          <div className="flex flex-col items-end group relative animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">YOU</span>
              <span className="text-[9px] text-gray-400 font-medium">Sending...</span>
            </div>
            <div className="flex items-center gap-2 max-w-[85%]">
              <div className="px-4 py-2.5 rounded-2xl bg-indigo-600/10 text-white border-indigo-200 rounded-tr-none relative overflow-hidden backdrop-blur-sm border shadow-sm">
                <div className="relative group/img opacity-50">
                  {localImageMessage.imageUrl && (
                    <img 
                      src={localImageMessage.imageUrl} 
                      alt="Uploading..." 
                      className="rounded-xl max-w-[200px] max-h-[200px] max-sm:max-w-[140px] max-sm:max-h-[140px] object-cover filter blur-[2px]" 
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {typingUser && (
          <div className="flex flex-col items-start px-1 animate-pulse">
            <span className="text-[9px] font-bold text-indigo-500 mb-1 uppercase tracking-widest">{typingUser} is typing...</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button onClick={() => scrollToBottom("smooth")} className="absolute bottom-24 right-5 p-3 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-all animate-bounce z-20 border-2 border-white/20"><ChevronDown size={20} /></button>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-2 sm:p-4 bg-white border-t border-gray-100 flex items-center gap-1.5 sm:gap-2">
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={imageUploading} className="p-2.5 sm:p-3 bg-gray-50 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-xl transition-all disabled:opacity-50 group shrink-0">
          {imageUploading ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <ImageIcon size={20} className="sm:w-[22px] sm:h-[22px] group-hover:scale-110 transition-transform" />}
        </button>
        <div className="flex-1 flex gap-1.5 sm:gap-2 min-w-0">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              socket?.emit("typing", { senderName: user?.firstName || "Someone", isTyping: true });
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => socket?.emit("typing", { senderName: user?.firstName || "Someone", isTyping: false }), 2000);
            }}
            placeholder="Write a message..."
            className="flex-1 px-3 py-2.5 sm:px-5 sm:py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none min-w-0"
          />
          <button type="submit" disabled={!newMessage.trim()} className="p-2.5 sm:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 group shrink-0">
            <Send size={20} className="sm:w-[22px] sm:h-[22px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </form>

      {/* Edit Modal (WhatsApp Style) */}
      {messageToEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMessageToEdit(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base"><Edit2 size={16} /> Edit Message</h3>
              <button onClick={() => setMessageToEdit(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 sm:p-5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                className="w-full p-3 sm:p-4 bg-gray-50 text-gray-800 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none text-xs sm:text-sm transition-all"
                rows={4}
                autoFocus
              />
              <div className="mt-4 sm:mt-5 flex justify-end gap-2 sm:gap-3">
                <button type="button" onClick={() => setMessageToEdit(null)} className="px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 sm:px-6 sm:py-2 bg-indigo-600 text-white text-[11px] sm:text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 uppercase tracking-wide">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setPreviewImageUrl(null)} />
          <button onClick={() => setPreviewImageUrl(null)} className="absolute top-6 right-6 text-white p-2 hover:bg-black/20 rounded-full transition-colors z-[71]"><X size={28} /></button>
          <img src={previewImageUrl} alt="Fullscreen preview" className="max-w-full max-h-full object-contain relative z-[71] rounded-lg shadow-2xl" />
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!messageToDeleteId}
        onConfirm={confirmDelete}
        onCancel={() => setMessageToDeleteId(null)}
        title="Delete message?"
        description="This will permanently delete the message for everyone in this chat."
        confirmText="Delete for everyone"
        cancelText="Cancel"
      />
    </div>
  );
};

export default Chat;
