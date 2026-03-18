import { Request, Response, NextFunction } from "express";
import { container } from "../config/container";
import { TYPES } from "../config/types";
import { INotificationService } from "../interfaces/services/INotificationService";
import { HttpStatus } from "../constants/httpStatus";
import { Messages } from "../constants/messages";
import { NotificationType } from "../models/notificationModel";

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: Messages.USER_NOT_AUTHENTICATED });
    }
 
    const filter = (req.query.filter as string) === "unread" ? "unread" : "all";
    const type = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;
 
    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const notifications = await notificationService.getNotifications(userId, filter, limit, skip, type);
 
    res.status(HttpStatus.OK).json({ notifications });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: Messages.USER_NOT_AUTHENTICATED });
    }

    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const notification = await notificationService.markAsRead(userId, notificationId);

    if (!notification) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: Messages.NOTIFICATION_NOT_FOUND });
    }

    res.status(HttpStatus.OK).json({ message: Messages.NOTIFICATION_MARK_READ, notification });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: Messages.USER_NOT_AUTHENTICATED });
    }

    const { type } = req.body as { type: string };
    if (!type || !["message", "poll"].includes(type)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: Messages.INVALID_NOTIFICATION_TYPE });
    }

    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    await notificationService.markAllAsRead(userId, type);

    res.status(HttpStatus.OK).json({ message: Messages.NOTIFICATIONS_MARK_ALL_READ });
  } catch (err) {
    next(err);
  }
};

export const getMuteSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: Messages.USER_NOT_AUTHENTICATED });
    }

    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const settings = await notificationService.getMuteSettings(userId);

    res.status(HttpStatus.OK).json({ muteSettings: settings });
  } catch (err) {
    next(err);
  }
};

export const toggleMute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: Messages.USER_NOT_AUTHENTICATED });
    }

    const { type } = req.body as { type: string };
    if (!type || !["message", "poll"].includes(type)) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: Messages.INVALID_NOTIFICATION_TYPE });
    }

    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const settings = await notificationService.toggleMute(userId, type as NotificationType);

    res.status(HttpStatus.OK).json({ message: Messages.MUTE_SETTINGS_UPDATED, muteSettings: settings });
  } catch (err) {
    next(err);
  }
};

export const getUnreadCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: Messages.USER_NOT_AUTHENTICATED });
    }

    const notificationService = container.get<INotificationService>(TYPES.NotificationService);
    const counts = await notificationService.getUnreadCounts(userId);

    res.status(HttpStatus.OK).json({ unreadCounts: counts });
  } catch (err) {
    next(err);
  }
};
