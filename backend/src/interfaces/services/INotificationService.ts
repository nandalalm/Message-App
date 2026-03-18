import { NotificationDTO, CreateNotificationDTO, MuteSettingsDTO, UnreadCountsDTO } from "../../dtos/notificationDtos";

export interface INotificationService {
  createNotification(data: CreateNotificationDTO): Promise<NotificationDTO>;
  getNotifications(userId: string, filter: "all" | "unread", limit: number, skip: number, type?: string): Promise<NotificationDTO[]>;
  markAsRead(userId: string, notificationId: string): Promise<NotificationDTO | null>;
  markAllAsRead(userId: string, type: string): Promise<void>;
  getMuteSettings(userId: string): Promise<MuteSettingsDTO>;
  toggleMute(userId: string, type: string): Promise<MuteSettingsDTO>;
  getUnreadCounts(userId: string): Promise<UnreadCountsDTO>;
}
