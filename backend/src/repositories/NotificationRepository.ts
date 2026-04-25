import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import { MessageNotificationModel, PollNotificationModel, INotification } from "../models/notificationModel";
import { IMessageNotificationRepository } from "../interfaces/Repositories/IMessageNotificationRepository";
import { IPollNotificationRepository } from "../interfaces/Repositories/IPollNotificationRepository";
import { FilterQuery } from "mongoose";

@injectable()
export class MessageNotificationRepository extends BaseRepository<INotification> implements IMessageNotificationRepository {
  constructor() {
    super(MessageNotificationModel);
  }

  async getByUserId(userId: string, limit: number, skip: number): Promise<INotification[]> {
    return this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getUnreadByUserId(userId: string, limit: number, skip: number): Promise<INotification[]> {
    return this.model
      .find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return this.model.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.model.updateMany({ userId, isRead: false }, { isRead: true });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, isRead: false });
  }
}

@injectable()
export class PollNotificationRepository extends BaseRepository<INotification> implements IPollNotificationRepository {
  constructor() {
    super(PollNotificationModel);
  }

  async createOrGetByUserAndRelatedId(data: Partial<INotification>): Promise<INotification> {
    if (!data.userId || !data.relatedId) {
      return this.create(data);
    }

    const filter: FilterQuery<INotification> = {
      userId: data.userId,
      type: data.type,
      relatedId: data.relatedId,
    };

    const notification = await this.model.findOneAndUpdate(
      filter,
      {
        $setOnInsert: {
          userId: data.userId,
          type: data.type,
          content: data.content,
          relatedId: data.relatedId,
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).exec();

    return notification;
  }

  async getByUserId(userId: string, limit: number, skip: number): Promise<INotification[]> {
    return this.model
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getUnreadByUserId(userId: string, limit: number, skip: number): Promise<INotification[]> {
    return this.model
      .find({ userId, isRead: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async markAsRead(notificationId: string, userId: string): Promise<INotification | null> {
    return this.model.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.model.updateMany({ userId, isRead: false }, { isRead: true });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, isRead: false });
  }
}
