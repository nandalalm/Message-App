import React, { useEffect, useState } from "react";
import { MessageSquare, Vote, X } from "lucide-react";
import type { NotificationItem } from "../types/notification";

interface NotificationToastProps {
  notification: NotificationItem;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const hideTimer = setTimeout(() => setVisible(false), 1500);
    const removeTimer = setTimeout(onClose, 2000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [onClose]);

  const isMessage = notification.type === "message";

  return (
    <div
      className={`flex items-start gap-3 w-80 max-w-[92vw] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 px-4 py-3 transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95"
      }`}
    >
      <div
        className={`p-2 rounded-xl shrink-0 ${
          isMessage ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
        }`}
      >
        {isMessage ? <MessageSquare size={16} /> : <Vote size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${isMessage ? "text-indigo-500" : "text-amber-500"}`}>
          {isMessage ? "New Message" : "New Poll"}
        </p>
        <p className="text-xs text-gray-700 font-medium leading-snug line-clamp-2">{notification.content}</p>
      </div>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default NotificationToast;
