import React, { useEffect, useRef, useState, useCallback } from "react";
import { CheckCheck, Bell, MessageSquare, BarChart3, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../redux/store";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  toggleNotificationMute,
  resetNotifications,
  fetchMuteSettings,
} from "../redux/notificationsSlice";
import type { NotificationType, NotificationFilter } from "../types/notification";
import ConfirmDialog from "./ConfirmDialog";

interface NotificationPanelProps {
  type: NotificationType;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ type, onClose }) => {
  const dispatch = useAppDispatch();
  const { messageNotifications, pollNotifications, messageHasMore, pollHasMore, muteSettings, loading } =
    useAppSelector((state) => state.notifications);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  const showMuteConfirmRef = useRef(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    showMuteConfirmRef.current = showMuteConfirm;
  }, [showMuteConfirm]);

  const notifications = type === "message" ? messageNotifications : pollNotifications;
  const hasMore = type === "message" ? messageHasMore : pollHasMore;
  const isMuted = muteSettings.mutedNotificationTypes.includes(type);

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const loadPage = useCallback(
    (skip: number) => {
      dispatch(fetchNotifications({ type, filter, skip }));
    },
    [dispatch, type, filter]
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    dispatch(fetchMuteSettings());
    dispatch(resetNotifications(type));
    loadPage(0);
  }, [filter, type, dispatch, loadPage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMuteConfirmRef.current) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || loading || !hasMore) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      loadPage(filteredNotifications.length);
    }
  };

  const handleMarkRead = (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.isRead) return;
    dispatch(markNotificationRead({ notificationId: id, type }));
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsRead(type));
  };

  const handleToggleMute = () => {
    setShowMuteConfirm(true);
  };

  const confirmMute = () => {
    dispatch(toggleNotificationMute(type));
    setShowMuteConfirm(false);
  };

  const isMessage = type === "message";
  const accentColor = isMessage
    ? { bg: "bg-indigo-600", badge: "bg-indigo-100 text-indigo-600", dot: "bg-indigo-500", ring: "ring-indigo-500" }
    : { bg: "bg-amber-500", badge: "bg-amber-100 text-amber-600", dot: "bg-amber-500", ring: "ring-amber-500" };

  return (
    <>
      <div
        ref={panelRef}
        className={`absolute top-0 right-0 ${windowWidth <= 360 ? 'w-[260px]' : 'w-80 w-[280px] min-[400px]:w-80'} max-w-[95vw] sm:max-w-xs bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 mt-1 isolate`}
        style={{ height: windowWidth <= 360 ? "380px" : "480px" }}
      >
        <div className={`${accentColor.bg} px-4 py-3 flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2 text-white">
            {isMessage ? <MessageSquare size={16} /> : <BarChart3 size={16} />}
            <span className="text-sm font-bold">{isMessage ? "Message" : "Poll"} Notifications</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleMute}
              className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100 bg-gray-50/60">
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
            {(["all", "unread"] as NotificationFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                  filter === f ? `${accentColor.bg} text-white shadow-sm` : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filter === "unread" && filteredNotifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              title="Mark all as read"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-[10px] font-bold"
            >
              <CheckCheck size={13} />
              All read
            </button>
          )}
        </div>

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-gray-50 bg-white"
        >
          {filteredNotifications.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <Bell size={36} className="mb-2 opacity-40" />
              <p className="text-xs font-medium italic">No notifications</p>
            </div>
          ) : (
            <>
              {filteredNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full text-left px-4 py-3 transition-all hover:bg-gray-50 flex items-start gap-3 ${
                    !n.isRead ? "bg-blue-50/60 hover:bg-blue-50" : ""
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {!n.isRead ? (
                      <span className={`block w-2 h-2 rounded-full ${accentColor.dot} ring-2 ${accentColor.ring} ring-offset-1`} />
                    ) : (
                      <span className="block w-2 h-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] leading-snug break-words ${!n.isRead ? "text-gray-800 font-semibold" : "text-gray-500 font-medium"}`}>
                      {n.content}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </button>
              ))}
              {loading && (
                <div className="flex justify-center py-4 bg-white">
                  <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isMessage ? "border-indigo-500" : "border-amber-500"}`} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showMuteConfirm}
        title={isMuted ? "Unmute notifications?" : "Mute notifications?"}
        description={
          isMuted
            ? `You will start receiving ${isMessage ? "message" : "poll"} notification toasts again.`
            : `You won't see ${isMessage ? "message" : "poll"} notification toasts. The icon count will still update.`
        }
        confirmText={isMuted ? "Unmute" : "Mute"}
        cancelText="Cancel"
        isDestructive={false}
        onConfirm={confirmMute}
        onCancel={() => setShowMuteConfirm(false)}
      />
    </>
  );
};

export default NotificationPanel;
