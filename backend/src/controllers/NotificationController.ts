import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types";
import { INotificationService } from "../interfaces/services/INotificationService";
import { HttpStatus } from "../constants/httpStatus";
import { Messages } from "../constants/messages";
import { NotificationType } from "../models/notificationModel";
import { AppError } from "../utils/AppError";

@injectable()
export class NotificationController {
  private _notificationService: INotificationService;

  constructor(@inject(TYPES.NotificationService) notificationService: INotificationService) {
    this._notificationService = notificationService;
  }

  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const filter = (req.query.filter as string) === "unread" ? "unread" : "all";
      const type = req.query.type as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = parseInt(req.query.skip as string) || 0;

      const notifications = await this._notificationService.getNotifications(userId, filter, limit, skip, type);

      res.status(HttpStatus.OK).json({ notifications });
    } catch (err) {
      next(err);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const notification = await this._notificationService.markAsRead(userId, notificationId);

      if (!notification) {
        return next(new AppError(Messages.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      res.status(HttpStatus.OK).json({ message: Messages.NOTIFICATION_MARK_READ, notification });
    } catch (err) {
      next(err);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const { type } = req.body as { type: string };
      if (!type || !["message", "poll"].includes(type)) {
        return next(new AppError(Messages.INVALID_NOTIFICATION_TYPE, HttpStatus.BAD_REQUEST));
      }

      await this._notificationService.markAllAsRead(userId, type);

      res.status(HttpStatus.OK).json({ message: Messages.NOTIFICATIONS_MARK_ALL_READ });
    } catch (err) {
      next(err);
    }
  };

  getMuteSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const settings = await this._notificationService.getMuteSettings(userId);

      res.status(HttpStatus.OK).json({ muteSettings: settings });
    } catch (err) {
      next(err);
    }
  };

  toggleMute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const { type } = req.body as { type: string };
      if (!type || !["message", "poll"].includes(type)) {
        return next(new AppError(Messages.INVALID_NOTIFICATION_TYPE, HttpStatus.BAD_REQUEST));
      }

      const settings = await this._notificationService.toggleMute(userId, type as NotificationType);

      res.status(HttpStatus.OK).json({ message: Messages.MUTE_SETTINGS_UPDATED, muteSettings: settings });
    } catch (err) {
      next(err);
    }
  };

  getUnreadCounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const counts = await this._notificationService.getUnreadCounts(userId);

      res.status(HttpStatus.OK).json({ unreadCounts: counts });
    } catch (err) {
      next(err);
    }
  };
}
