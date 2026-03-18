import { NotificationType } from "../models/notificationModel";

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  content: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  content: string;
  relatedId?: string;
}

export interface MuteSettingsDTO {
  mutedNotificationTypes: string[];
}

export interface UnreadCountsDTO {
  message: number;
  poll: number;
}
