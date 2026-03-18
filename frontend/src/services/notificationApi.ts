import axiosInstance from "../api/axiosInstance";
import type { NotificationItem, MuteSettings, NotificationFilter, NotificationType } from "../types/notification";

interface GetNotificationsParams {
  filter: NotificationFilter;
  type?: NotificationType;
  limit?: number;
  skip?: number;
}

interface GetNotificationsResponse {
  notifications: NotificationItem[];
}

interface MarkReadResponse {
  notification: NotificationItem;
}

interface MuteSettingsResponse {
  muteSettings: MuteSettings;
}

interface GetUnreadCountsResponse {
  unreadCounts: {
    message: number;
    poll: number;
  };
}

export class NotificationApi {
  static async getNotifications(params: GetNotificationsParams): Promise<GetNotificationsResponse> {
    const { filter, type, limit = 20, skip = 0 } = params;
    let url = `/notifications?filter=${filter}&limit=${limit}&skip=${skip}`;
    if (type) url += `&type=${type}`;
    const response = await axiosInstance.get(url);
    return response.data;
  }

  static async markAsRead(notificationId: string): Promise<MarkReadResponse> {
    const response = await axiosInstance.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  static async markAllAsRead(type: NotificationType): Promise<void> {
    await axiosInstance.patch("/notifications/mark-all-read", { type });
  }

  static async getMuteSettings(): Promise<MuteSettingsResponse> {
    const response = await axiosInstance.get("/notifications/mute-settings");
    return response.data;
  }

  static async toggleMute(type: NotificationType): Promise<MuteSettingsResponse> {
    const response = await axiosInstance.patch("/notifications/mute", { type });
    return response.data;
  }

  static async getUnreadCounts(): Promise<GetUnreadCountsResponse> {
    const response = await axiosInstance.get("/notifications/unread-counts");
    return response.data;
  }
}
