import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useAppSelector } from "../redux/store";
import { fetchMuteSettings } from "../redux/notificationsSlice";
import { useAppDispatch } from "../redux/store";
import NotificationPanel from "./NotificationPanel";

interface NotificationIconProps {
  onMount?: () => void;
}

const NotificationIcon: React.FC<NotificationIconProps> = () => {
  const dispatch = useAppDispatch();
  const { messageUnreadCount, muteSettings } = useAppSelector((state) => state.notifications);
  const [panelOpen, setPanelOpen] = useState(false);
  const isMuted = muteSettings.mutedNotificationTypes.includes("message");

  const handleOpen = () => {
    if (!panelOpen) {
      dispatch(fetchMuteSettings());
    }
    setPanelOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className={`relative p-2 rounded-xl transition-all ${
          isMuted ? "bg-white/10 text-white/50" : "bg-white/20 hover:bg-white/30 text-white"
        }`}
        title={isMuted ? "Notifications muted" : "Notifications"}
      >
        <Bell size={18} className={isMuted ? "text-white/40" : "text-white"} />
        {isMuted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[1.5px] h-[18px] bg-white/40 -rotate-45 rounded-full" />
          </div>
        )}
        {messageUnreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1 shadow-lg ${
              isMuted ? "bg-gray-300 text-gray-900" : "bg-red-500 text-white"
            }`}
          >
            {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
          </span>
        )}

      </button>
      {panelOpen && (
        <NotificationPanel type="message" onClose={() => setPanelOpen(false)} />
      )}
    </div>
  );
};

export default NotificationIcon;
