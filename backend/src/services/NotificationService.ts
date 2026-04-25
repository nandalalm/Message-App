import { injectable, inject } from "inversify";
import { INotificationService } from "../interfaces/services/INotificationService";
import { IMessageNotificationRepository } from "../interfaces/Repositories/IMessageNotificationRepository";
import { IPollNotificationRepository } from "../interfaces/Repositories/IPollNotificationRepository";
import { IUserRepository } from "../interfaces/Repositories/IUserRepository";
import { TYPES } from "../config/types";
import { NotificationDTO, CreateNotificationDTO, MuteSettingsDTO, UnreadCountsDTO } from "../dtos/notificationDtos";
import { INotification } from "../models/notificationModel";
import { Messages } from "../constants/messages";
import mongoose from "mongoose";

@injectable()
export class NotificationService implements INotificationService {
  private _messageRepository: IMessageNotificationRepository;
  private _pollRepository: IPollNotificationRepository;
  private _userRepository: IUserRepository;

  constructor(
    @inject(TYPES.MessageNotificationRepository) messageRepository: IMessageNotificationRepository,
    @inject(TYPES.PollNotificationRepository) pollRepository: IPollNotificationRepository,
    @inject(TYPES.UserRepository) userRepository: IUserRepository
  ) {
    this._messageRepository = messageRepository;
    this._pollRepository = pollRepository;
    this._userRepository = userRepository;
  }

  async createNotification(data: CreateNotificationDTO): Promise<NotificationDTO> {
    const notificationData = {
      userId: new mongoose.Types.ObjectId(data.userId),
      type: data.type,
      content: data.content,
      relatedId: data.relatedId,
    } as Partial<INotification>;

    const notification = data.type === "message"
      ? await this._messageRepository.create(notificationData)
      : await this._pollRepository.createOrGetByUserAndRelatedId(notificationData);

    return this.mapToDTO(notification);
  }

  async getNotifications(
    userId: string,
    filter: "all" | "unread",
    limit: number,
    skip: number,
    type?: string
  ): Promise<NotificationDTO[]> {
    const finalLimit = limit > 20 ? 20 : limit;
    const repository = type === "poll" ? this._pollRepository : this._messageRepository;
    
    const notifications =
      filter === "unread"
        ? await repository.getUnreadByUserId(userId, finalLimit, skip)
        : await repository.getByUserId(userId, finalLimit, skip);
    return notifications.map((n) => this.mapToDTO(n));
  }

  async markAsRead(userId: string, notificationId: string): Promise<NotificationDTO | null> {
    let notification = await this._messageRepository.markAsRead(notificationId, userId);
    if (!notification) {
      notification = await this._pollRepository.markAsRead(notificationId, userId);
    }
    
    if (!notification) return null;
    return this.mapToDTO(notification);
  }

  async markAllAsRead(userId: string, type: string): Promise<void> {
    const repository = type === "poll" ? this._pollRepository : this._messageRepository;
    await repository.markAllAsRead(userId);
  }

  async getMuteSettings(userId: string): Promise<MuteSettingsDTO> {
    const user = await this._userRepository.findById(userId);
    return { mutedNotificationTypes: user?.mutedNotificationTypes ?? [] };
  }

  async toggleMute(userId: string, type: string): Promise<MuteSettingsDTO> {
    const user = await this._userRepository.findById(userId);
    if (!user) throw new Error(Messages.USER_NOT_FOUND);
    const muted = user.mutedNotificationTypes ?? [];
    const isMuted = muted.includes(type);
    const updated = isMuted ? muted.filter((t) => t !== type) : [...muted, type];
    await this._userRepository.update(userId, { mutedNotificationTypes: updated });
    return { mutedNotificationTypes: updated };
  }

  async getUnreadCounts(userId: string): Promise<UnreadCountsDTO> {
    const [messageCount, pollCount] = await Promise.all([
      this._messageRepository.getUnreadCount(userId),
      this._pollRepository.getUnreadCount(userId),
    ]);
    return { message: messageCount, poll: pollCount };
  }

  private mapToDTO(notification: INotification): NotificationDTO {
    return {
      id: (notification._id as mongoose.Types.ObjectId).toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      content: notification.content,
      isRead: notification.isRead,
      relatedId: notification.relatedId,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
