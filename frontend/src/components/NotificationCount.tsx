import React, { useState } from "react";
import { BarChart3 } from "lucide-react";
import { useAppSelector } from "../redux/store";
import { fetchMuteSettings } from "../redux/notificationsSlice";
import { useAppDispatch } from "../redux/store";
import NotificationPanel from "./NotificationPanel";

const NotificationCount: React.FC = () => {
  const dispatch = useAppDispatch();
  const { pollUnreadCount, muteSettings } = useAppSelector((state) => state.notifications);
  const [panelOpen, setPanelOpen] = useState(false);
  const isMuted = muteSettings.mutedNotificationTypes.includes("poll");

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
        <BarChart3 size={18} className={isMuted ? "text-white/40" : "text-white"} />
        {isMuted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[1.5px] h-[18px] bg-white/40 -rotate-45 rounded-full" />
          </div>
        )}
        {pollUnreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[9px] font-black flex items-center justify-center px-1 shadow-lg ${
              isMuted ? "bg-gray-300 text-gray-900" : "bg-red-500 text-white"
            }`}
          >
            {pollUnreadCount > 9 ? "9+" : pollUnreadCount}
          </span>
        )}

      </button>
      {panelOpen && (
        <NotificationPanel type="poll" onClose={() => setPanelOpen(false)} />
      )}
    </div>
  );
};

export default NotificationCount;
