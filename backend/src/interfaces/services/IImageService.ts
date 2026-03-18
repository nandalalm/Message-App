import { IImage } from "../../models/imageModel";

export interface ImageFileData {
  file: Buffer;
  fileName: string;
  contentType: string;
}

export interface ImageUploadData {
  imageUrl: string;
}

export interface PaginatedImagesResult {
  images: IImage[];
  total: number;
}

export interface IImageService {
  createImagesFromFiles(userId: string, files: ImageFileData[]): Promise<IImage[]>;
  createImages(userId: string, images: ImageUploadData[]): Promise<IImage[]>;
  getUserImages(userId: string, limit?: number, skip?: number): Promise<PaginatedImagesResult>;
  updateImage(userId: string, imageId: string, file?: ImageFileData): Promise<IImage | null>;
  deleteImage(userId: string, imageId: string): Promise<boolean>;
  deleteByKey(s3Key: string): Promise<void>;
  generateSignedUrl(s3Key: string, expiresIn?: number): Promise<string>;
  generateSignedUrlsForImages(images: IImage[]): Promise<Array<IImage & { signedUrl: string }>>;
}
