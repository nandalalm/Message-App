import { INotification } from "../../models/notificationModel";

export interface IPollNotificationRepository {
  getByUserId(userId: string, limit: number, skip: number): Promise<INotification[]>;
  getUnreadByUserId(userId: string, limit: number, skip: number): Promise<INotification[]>;
  markAsRead(notificationId: string, userId: string): Promise<INotification | null>;
  markAllAsRead(userId: string): Promise<void>;
  create(data: Partial<INotification>): Promise<INotification>;
  createOrGetByUserAndRelatedId(data: Partial<INotification>): Promise<INotification>;
  getUnreadCount(userId: string): Promise<number>;
}
