export type NotificationType = "message" | "poll";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  content: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export interface MuteSettings {
  mutedNotificationTypes: string[];
}

export type NotificationFilter = "all" | "unread";
