import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IImageService, ImageFileData, ImageUploadData, PaginatedImagesResult } from "../interfaces/services/IImageService";
import { IImageRepository } from "../interfaces/Repositories/IImageRepository";
import { IImage } from "../models/imageModel";
import { logError } from "../middleware/loggerMiddleware";
import { Messages } from "../constants/messages";

export class ImageService implements IImageService {
  private _imageRepository: IImageRepository;
  private _s3Client: S3Client;

  constructor(imageRepository: IImageRepository) {
    this._imageRepository = imageRepository;

    const requiredEnvVars = {
      AWS_S3_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    };

    const missing = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error(Messages.MISSING_ENV_VARS + ':', missing);
      console.error(Messages.ENV_VARS_INSTRUCTION);
      missing.forEach(envVar => {
        console.error(Messages.ENV_VAR_FORMAT.replace('{envVar}', envVar).replace('{envVar_lower}', envVar.toLowerCase()));
      });
    }

    const awsRegion = process.env.AWS_REGION;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error("AWS configuration missing");
    }

    this._s3Client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });
  }

  private async uploadToS3(file: Buffer, fileName: string, contentType: string): Promise<{ url: string; key: string }> {
    try {
      if (!process.env.AWS_BUCKET_NAME) {
        throw new Error(Messages.S3_BUCKET_NOT_CONFIGURED);
      }

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const key = `images/${timestamp}-${randomString}-${fileName}`;

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      };

      const command = new PutObjectCommand(params);
      await this._s3Client.send(command);

      const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      return { url, key };
    } catch (error) {
      console.error(Messages.S3_UPLOAD_FAILED + ':', error);
      throw new Error(Messages.S3_UPLOAD_ERROR.replace('{error}', error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async createImagesFromFiles(userId: string, files: ImageFileData[]): Promise<IImage[]> {
    const createdImages: IImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];

        try {
          const { url, key } = await this.uploadToS3(fileData.file, fileData.fileName, fileData.contentType);

          const imageData = {
            userId: new (await import('mongoose')).Types.ObjectId(userId),
            imageUrl: url,
            s3Key: key,
          };

          const createdImage = await this._imageRepository.create(imageData);
          createdImages.push(createdImage);
        } catch (error) {
          console.error(Messages.IMAGE_CREATE_FAILED.replace('{index}', (i + 1).toString()) + ':', error);
          logError(error as Error, undefined, { userId, fileData: { fileName: fileData.fileName } });
          throw new Error(Messages.IMAGE_CREATE_ERROR.replace('{index}', (i + 1).toString()).replace('{error}', error instanceof Error ? error.message : 'Unknown error'));
        }
      }

      return createdImages;
    } catch (error) {
      console.error(Messages.CREATE_IMAGES_FAILED + ':', error);
      throw error;
    }
  }

  async createImages(userId: string, images: ImageUploadData[]): Promise<IImage[]> {
    const createdImages: IImage[] = [];

    for (const imageData of images) {
      try {
        const newImage = await this._imageRepository.create({
          userId: new (await import('mongoose')).Types.ObjectId(userId),
          imageUrl: imageData.imageUrl,
        });

        createdImages.push(newImage);
      } catch (error) {
        console.error(Messages.IMAGE_RECORD_CREATE_FAILED + ':', error);
        logError(error as Error, undefined, { userId, imageData: { imageUrl: imageData.imageUrl } });
        throw new Error(Messages.IMAGE_RECORD_CREATE_FAILED);
      }
    }

    return createdImages;
  }

  async getUserImages(userId: string, limit?: number, skip?: number): Promise<PaginatedImagesResult> {
    if (limit !== undefined && skip !== undefined) {
      const images = await this._imageRepository.findByUserIdPaginated(userId, limit, skip);
      const total = await this._imageRepository.countByUserId(userId);
      return { images, total };
    } else {
      const images = await this._imageRepository.findByUserId(userId);
      return { images, total: images.length };
    }
  }

  async updateImage(userId: string, imageId: string, file?: ImageFileData): Promise<IImage | null> {
    const existingImage = await this._imageRepository.findByUserIdAndId(userId, imageId);
    if (!existingImage) {
      throw new Error(Messages.IMAGE_NOT_FOUND);
    }

    const updateData: Partial<IImage> = {};

    if (file) {
      const { url, key } = await this.uploadToS3(file.file, file.fileName, file.contentType);
      updateData.imageUrl = url;
      updateData.s3Key = key;
    }

    Object.assign(existingImage, updateData);
    await existingImage.save();

    return existingImage;
  }

  async deleteImage(userId: string, imageId: string): Promise<boolean> {
    const existingImage = await this._imageRepository.findByUserIdAndId(userId, imageId);
    if (!existingImage) {
      throw new Error(Messages.IMAGE_NOT_FOUND);
    }

    try {
      await this.deleteFromS3(existingImage.s3Key);
      const deleted = await this._imageRepository.deleteByUserIdAndId(userId, imageId);
      return deleted;
    } catch (error) {
      console.error(`Failed to delete image ${imageId}:`, error);
      console.warn(`S3 deletion failed for image ${imageId}, proceeding with database deletion`);
      return await this._imageRepository.deleteByUserIdAndId(userId, imageId);
    }
  }



  async generateSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      if (!process.env.AWS_BUCKET_NAME) {
        throw new Error(Messages.S3_BUCKET_NOT_CONFIGURED);
      }

      const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
      });

      const signedUrl = await getSignedUrl(this._s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateSignedUrlsForImages(images: IImage[]): Promise<Array<IImage & { signedUrl: string }>> {
    const imagesWithSignedUrls = await Promise.all(
      images.map(async (image) => {
        try {
          const signedUrl = await this.generateSignedUrl(image.s3Key);
          return { ...image.toObject(), signedUrl };
        } catch (error) {
          console.error(`Failed to generate signed URL for image ${(image as IImage)._id}:`, error);
          return { ...image.toObject(), signedUrl: image.imageUrl };
        }
      })
    );
    return imagesWithSignedUrls;
  }

  private async deleteFromS3(s3Key: string): Promise<void> {
    try {
      if (!process.env.AWS_BUCKET_NAME) {
        throw new Error(Messages.S3_BUCKET_NOT_CONFIGURED);
      }

      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
      });

      await this._s3Client.send(command);
    } catch (error) {
      console.error(`Failed to delete S3 object ${s3Key}:`, error);
      throw new Error(`Failed to delete S3 object: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
