import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { container } from "../config/container";
import { TYPES } from "../config/types";
import { AuthController } from "../controllers/authController";

const router = Router();
const authController = container.get<AuthController>(TYPES.AuthController);

router.post("/register", authController.register);
router.post("/check-username", authController.checkUsername);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/refresh-token", authController.refreshToken);
router.get("/home", authMiddleware, authController.getHome);
router.post("/logout", authController.logout);

export default router;
