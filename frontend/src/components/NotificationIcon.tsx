import React, { useState } from "react";
import { Bell, BellOff } from "lucide-react";
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
        {isMuted ? (
          <BellOff size={18} className="opacity-60" />
        ) : (
          <Bell size={18} />
        )}
        {messageUnreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-black flex items-center justify-center px-1 shadow-lg ${
              isMuted ? "bg-gray-400" : "bg-red-500"
            }`}
          >
            {messageUnreadCount > 99 ? "99+" : messageUnreadCount}
          </span>
        )}
        {isMuted && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-white/40 font-black text-xl leading-none" style={{ marginTop: "-1px" }}>/</span>
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
