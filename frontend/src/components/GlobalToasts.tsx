import React, { useState, useEffect, useCallback } from "react";
import NotificationToast from "./NotificationToast";
import type { NotificationItem } from "../types/notification";

const GlobalToasts: React.FC = () => {
  const [toastQueue, setToastQueue] = useState<NotificationItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const handleGlobalNotification = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationItem>;
      const notification = customEvent.detail;
      setToastQueue((prev) => [notification, ...prev].slice(0, 5));
    };

    window.addEventListener("globalNotification", handleGlobalNotification);
    return () => {
      window.removeEventListener("globalNotification", handleGlobalNotification);
    };
  }, []);

  if (toastQueue.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-80 pointer-events-none h-20">
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          className="absolute inset-0 pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            zIndex: 200 + (toastQueue.length - index),
            transform: `translateY(${index * 12}px) scale(${1 - index * 0.05})`,
            opacity: 1 - index * 0.2,
            filter: `blur(${index * 0.5}px)`,
          }}
        >
          <NotificationToast
            notification={toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default GlobalToasts;
