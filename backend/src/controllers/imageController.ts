import { Request, Response, NextFunction } from "express";
import { inject, injectable } from "inversify";
import { TYPES } from "../config/types";
import { IImageService, ImageFileData } from "../interfaces/services/IImageService";
import { IImage } from "../models/imageModel";
import { HttpStatus } from "../constants/httpStatus";
import { Messages } from "../constants/messages";
import { JwtPayload } from "jsonwebtoken";
import { AppError } from "../utils/AppError";

interface AuthenticatedJwtPayload extends JwtPayload {
  id: string;
  email: string;
}

@injectable()
export class ImageController {
  private _imageService: IImageService;

  constructor(@inject(TYPES.ImageService) imageService: IImageService) {
    this._imageService = imageService;
  }

  createImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const { images } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return next(new AppError(Messages.NO_IMAGES_PROVIDED, HttpStatus.BAD_REQUEST));
      }

      for (const img of images) {
        if (!img.imageUrl || !img.s3Key) {
          return next(new AppError(Messages.IMAGE_FIELDS_REQUIRED, HttpStatus.BAD_REQUEST));
        }
      }

      const createdImages = await this._imageService.createImages(userId, images);

      res.status(HttpStatus.CREATED).json({
        message: Messages.IMAGES_CREATED,
        images: createdImages
      });
    } catch (err) {
      next(err);
    }
  };

  getUserImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 6;
      const skip = (page - 1) * limit;

      const result = await this._imageService.getUserImages(userId, limit, skip);

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(" ")[1];

      res.status(HttpStatus.OK).json({
        images: result.images.map(img => ({
          id: img._id,
          imageUrl: `/api/images/serve/${img._id}${accessToken ? `?token=${accessToken}` : ""}`,
          createdAt: img.createdAt
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(result.total / limit),
          totalImages: result.total,
          hasMore: skip + result.images.length < result.total
        }
      });
    } catch (err) {
      next(err);
    }
  };

  updateImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { imageId } = req.params;
      const file = req.file;

      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      let fileData: ImageFileData | undefined;
      if (file) {
        fileData = {
          file: file.buffer,
          fileName: file.originalname,
          contentType: file.mimetype
        };
      }

      const updatedImage = await this._imageService.updateImage(userId, imageId, fileData);

      if (!updatedImage) {
        return next(new AppError(Messages.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(" ")[1];

      res.status(HttpStatus.OK).json({
        message: Messages.IMAGE_UPDATED,
        image: {
          id: updatedImage._id,
          imageUrl: `/api/images/serve/${updatedImage._id}${accessToken ? `?token=${accessToken}` : ""}`,
          createdAt: updatedImage.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  };

  deleteImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { imageId } = req.params;

      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const deleted = await this._imageService.deleteImage(userId, imageId);

      if (!deleted) {
        return next(new AppError(Messages.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      res.status(HttpStatus.OK).json({
        message: Messages.IMAGE_DELETED
      });
    } catch (err) {
      next(err);
    }
  };

  uploadImages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const files = req.files as { buffer: Buffer; originalname: string; mimetype: string }[];
      if (!files || files.length === 0) {
        return next(new AppError(Messages.NO_FILES_UPLOADED, HttpStatus.BAD_REQUEST));
      }

      const imageFiles: ImageFileData[] = files.map((file) => ({
        file: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype
      }));

      const createdImages = await this._imageService.createImagesFromFiles(userId, imageFiles);

      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(" ")[1];

      res.status(HttpStatus.CREATED).json({
        message: Messages.IMAGES_UPLOADED,
        images: createdImages.map(img => ({
          _id: img._id,
          imageUrl: `/api/images/serve/${img._id}${accessToken ? `?token=${accessToken}` : ""}`,
          s3Key: img.s3Key,
          createdAt: img.createdAt
        }))
      });
    } catch (err) {
      next(err);
    }
  };

  serveImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let userId: string | undefined;
      const { imageId } = req.params;
      const { token } = req.query;

      const authHeader = req.headers.authorization;
      const authToken = authHeader?.split(" ")[1];

      if (authToken) {
        try {
          const jwt = (await import("jsonwebtoken")).default;
          const accessSecret = process.env.ACCESS_TOKEN_SECRET;
          if (!accessSecret) throw new Error(Messages.MISSING_ACCESS_TOKEN_SECRET);
          const decoded = jwt.verify(authToken, accessSecret) as AuthenticatedJwtPayload;
          userId = decoded.id;
        } catch {
          userId = undefined;
        }
      }

      if (!userId && token) {
        try {
          const jwt = (await import("jsonwebtoken")).default;
          const accessSecret = process.env.ACCESS_TOKEN_SECRET;
          if (!accessSecret) throw new Error(Messages.MISSING_ACCESS_TOKEN_SECRET);
          const decoded = jwt.verify(token as string, accessSecret) as AuthenticatedJwtPayload;
          userId = decoded.id;
        } catch {
          return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
        }
      }

      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const result = await this._imageService.getUserImages(userId);
      const images = result.images as IImage[];
      const image = images.find(img => img._id?.toString() === imageId);

      if (!image) {
        return next(new AppError(Messages.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }
      const signedUrl = await this._imageService.generateSignedUrl(image.s3Key, 300);

      const fetch = (await import("node-fetch")).default;
      const imageResponse = await fetch(signedUrl);

      if (!imageResponse.ok) {
        return next(new AppError(Messages.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      res.set({
        "Content-Type": imageResponse.headers.get("content-type") || "image/jpeg",
        "Content-Length": imageResponse.headers.get("content-length") || "",
        "Cache-Control": "private, max-age=300",
      });

      imageResponse.body?.pipe(res);
    } catch (err) {
      next(err);
    }
  };

  getSignedUrl = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { imageId } = req.params;
      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;

      if (!userId) {
        return next(new AppError(Messages.USER_NOT_AUTHENTICATED, HttpStatus.UNAUTHORIZED));
      }

      const result = await this._imageService.getUserImages(userId);
      const images = result.images as IImage[];
      const image = images.find(img => img._id?.toString() === imageId);

      if (!image) {
        return next(new AppError(Messages.IMAGE_NOT_FOUND, HttpStatus.NOT_FOUND));
      }

      const signedUrl = await this._imageService.generateSignedUrl(image.s3Key, expiresIn);

      res.status(HttpStatus.OK).json({
        signedUrl,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      });
    } catch (err) {
      next(err);
    }
  };
}
