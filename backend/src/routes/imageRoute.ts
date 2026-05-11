import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";
import { container } from "../config/container";
import { TYPES } from "../config/types";
import { ImageController } from "../controllers/imageController";
import { AppError } from "../utils/AppError";
import { Messages } from "../constants/messages";
import { HttpStatus } from "../constants/httpStatus";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new AppError(Messages.INVALID_FILE_TYPE, HttpStatus.BAD_REQUEST));
    }
  },
});

const router = Router();
const imageController = container.get<ImageController>(TYPES.ImageController);

router.post("/upload-files", authMiddleware, upload.array('images'), imageController.uploadImages);
router.post("/create-from-urls", authMiddleware, imageController.createImages);
router.get("/my-images", authMiddleware, imageController.getUserImages);
router.get("/serve/:imageId", imageController.serveImage);
router.get("/signed-url/:imageId", authMiddleware, imageController.getSignedUrl);
router.put("/update/:imageId", authMiddleware, upload.single('image'), imageController.updateImage);
router.delete("/delete/:imageId", authMiddleware, imageController.deleteImage);

export default router;
