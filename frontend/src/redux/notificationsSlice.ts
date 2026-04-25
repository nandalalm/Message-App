import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { NotificationItem, MuteSettings, NotificationFilter, NotificationType } from "../types/notification";
import { NotificationApi } from "../services/notificationApi";

interface NotificationsState {
  messageNotifications: NotificationItem[];
  pollNotifications: NotificationItem[];
  messageUnreadCount: number;
  pollUnreadCount: number;
  messageHasMore: boolean;
  pollHasMore: boolean;
  muteSettings: MuteSettings;
  loading: boolean;
}

const initialState: NotificationsState = {
  messageNotifications: [],
  pollNotifications: [],
  messageUnreadCount: 0,
  pollUnreadCount: 0,
  messageHasMore: true,
  pollHasMore: true,
  muteSettings: { mutedNotificationTypes: [] },
  loading: false,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (params: { type: NotificationType; filter: NotificationFilter; skip: number }) => {
    const response = await NotificationApi.getNotifications({
      filter: params.filter,
      type: params.type,
      limit: 20,
      skip: params.skip,
    });
    return { notifications: response.notifications, type: params.type, skip: params.skip };
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (params: { notificationId: string; type: NotificationType }) => {
    const response = await NotificationApi.markAsRead(params.notificationId);
    return { notification: response.notification, type: params.type };
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (type: NotificationType) => {
    await NotificationApi.markAllAsRead(type);
    return type;
  }
);

export const fetchMuteSettings = createAsyncThunk(
  "notifications/fetchMuteSettings",
  async () => {
    const response = await NotificationApi.getMuteSettings();
    return response.muteSettings;
  }
);

export const toggleNotificationMute = createAsyncThunk(
  "notifications/toggleMute",
  async (type: NotificationType) => {
    const response = await NotificationApi.toggleMute(type);
    return response.muteSettings;
  }
);

export const fetchUnreadCounts = createAsyncThunk(
  "notifications/fetchUnreadCounts",
  async () => {
    const response = await NotificationApi.getUnreadCounts();
    return response.unreadCounts;
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    addIncomingNotification: (state, action: PayloadAction<NotificationItem>) => {
      const notification = action.payload;
      if (notification.type === "message") {
        state.messageNotifications = state.messageNotifications.filter((item) => item.id !== notification.id);
        state.messageNotifications = [notification, ...state.messageNotifications].slice(0, 100);
        state.messageUnreadCount += 1;
      } else {
        state.pollNotifications = state.pollNotifications.filter((item) => item.id !== notification.id);
        state.pollNotifications = [notification, ...state.pollNotifications].slice(0, 100);
        state.pollUnreadCount += 1;
      }
    },
    resetNotifications: (state, action: PayloadAction<NotificationType>) => {
      if (action.payload === "message") {
        state.messageNotifications = [];
        state.messageHasMore = true;
      } else {
        state.pollNotifications = [];
        state.pollHasMore = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        const { notifications, type, skip } = action.payload;
        const hasMore = notifications.length === 20;

        if (type === "message") {
          state.messageNotifications =
            skip === 0
              ? notifications
              : [...state.messageNotifications, ...notifications];
          state.messageHasMore = hasMore;
        } else {
          state.pollNotifications =
            skip === 0
              ? notifications
              : [...state.pollNotifications, ...notifications];
          state.pollHasMore = hasMore;
        }
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const { notification, type } = action.payload;
        if (type === "message") {
          state.messageNotifications = state.messageNotifications.map((n) =>
            n.id === notification.id ? notification : n
          );
          state.messageUnreadCount = Math.max(0, state.messageUnreadCount - 1);
        } else {
          state.pollNotifications = state.pollNotifications.map((n) =>
            n.id === notification.id ? notification : n
          );
          state.pollUnreadCount = Math.max(0, state.pollUnreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state, action) => {
        const type = action.payload;
        if (type === "message") {
          state.messageNotifications = state.messageNotifications.map((n) => ({ ...n, isRead: true }));
          state.messageUnreadCount = 0;
        } else {
          state.pollNotifications = state.pollNotifications.map((n) => ({ ...n, isRead: true }));
          state.pollUnreadCount = 0;
        }
      })
      .addCase(fetchUnreadCounts.fulfilled, (state, action) => {
        state.messageUnreadCount = action.payload.message;
        state.pollUnreadCount = action.payload.poll;
      })
      .addCase(fetchMuteSettings.fulfilled, (state, action) => {
        state.muteSettings = action.payload;
      })
      .addCase(toggleNotificationMute.fulfilled, (state, action) => {
        state.muteSettings = action.payload;
      });
  },
});

export const { addIncomingNotification, resetNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
