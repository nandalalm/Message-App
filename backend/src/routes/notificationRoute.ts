import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { container } from "../config/container";
import { TYPES } from "../config/types";
import { NotificationController } from "../controllers/NotificationController";

const router = Router();
const notificationController = container.get<NotificationController>(TYPES.NotificationController);

router.get("/", authMiddleware, notificationController.getNotifications);
router.get("/unread-counts", authMiddleware, notificationController.getUnreadCounts);
router.patch("/:notificationId/read", authMiddleware, notificationController.markAsRead);
router.patch("/mark-all-read", authMiddleware, notificationController.markAllAsRead);
router.get("/mute-settings", authMiddleware, notificationController.getMuteSettings);
router.patch("/mute", authMiddleware, notificationController.toggleMute);

export default router;
