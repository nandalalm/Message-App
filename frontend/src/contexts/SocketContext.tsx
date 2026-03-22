import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "../redux/store";
import { addIncomingNotification } from "../redux/notificationsSlice";
import type { NotificationItem } from "../types/notification";
import { SocketContext } from "./useSocketHook";

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAppSelector((state) => state.auth);
  const { muteSettings } = useAppSelector((state) => state.notifications);

  const muteSettingsRef = useRef(muteSettings);
  useEffect(() => {
    muteSettingsRef.current = muteSettings;
  }, [muteSettings]);

  useEffect(() => {
    if (!accessToken) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    const socketUrl = backendUrl || apiBaseUrl?.replace("/api", "") || "http://localhost:5000";

    const newSocket = io(socketUrl, {
      auth: { token: accessToken },
      withCredentials: true,
      transports: ["polling", "websocket"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("newNotification", (notification: NotificationItem) => {
      dispatch(addIncomingNotification(notification));

      const isMuted = muteSettingsRef.current.mutedNotificationTypes.includes(notification.type);
      if (!isMuted) {
        const event = new CustomEvent("globalNotification", { detail: notification });
        window.dispatchEvent(event);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, dispatch]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
