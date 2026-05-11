import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { container } from "../config/container";
import { TYPES } from "../config/types";
import { AuthController } from "../controllers/authController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const authController = container.get<AuthController>(TYPES.AuthController);

router.get("/profileinfo", authMiddleware, authController.getProfile);
router.get("/profile-image", authController.serveProfileImage);
router.patch("/updateImage", authMiddleware, upload.single('image'), authController.updateProfilePhoto);
router.delete("/deleteImage", authMiddleware, authController.deleteProfilePhoto);

export default router;
