import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./redux/store"
import { refreshAccessToken } from "./redux/authSlice";
import Router from "./routes/Router";
import { fetchProfile } from "./redux/authSlice";
import { fetchUnreadCounts, fetchNotifications } from "./redux/notificationsSlice";
import { SocketProvider } from "./context/SocketContext";
import GlobalToasts from "./components/GlobalToasts";

const App = () => {
  const dispatch = useAppDispatch();
  const { accessToken } = useAppSelector((state) => state.auth);
  const hasTriedRefresh = useRef(false);

  useEffect(() => {
    if (!accessToken && !hasTriedRefresh.current) {
      hasTriedRefresh.current = true;
      dispatch(refreshAccessToken()).catch(() => {
      });
    }
  }, [dispatch, accessToken]);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchProfile());
      dispatch(fetchUnreadCounts());
      // Sync latest 20 notifications for both types
      dispatch(fetchNotifications({ type: "message", filter: "all", skip: 0 }));
      dispatch(fetchNotifications({ type: "poll", filter: "all", skip: 0 }));
    }
  }, [dispatch, accessToken]);

  return (
    <SocketProvider>
      <GlobalToasts />
      <Router />
    </SocketProvider>
  );
};

export default App;
