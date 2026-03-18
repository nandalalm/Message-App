import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getNotifications,
  getUnreadCounts,
  markAsRead,
  markAllAsRead,
  getMuteSettings,
  toggleMute,
} from "../controllers/NotificationController";

const router = Router();

router.get("/", authMiddleware, getNotifications);
router.get("/unread-counts", authMiddleware, getUnreadCounts);
router.patch("/:notificationId/read", authMiddleware, markAsRead);
router.patch("/mark-all-read", authMiddleware, markAllAsRead);
router.get("/mute-settings", authMiddleware, getMuteSettings);
router.patch("/mute", authMiddleware, toggleMute);

export default router;
