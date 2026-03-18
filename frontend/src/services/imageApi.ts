import axiosInstance from "../api/axiosInstance";
import type {
  ImageItem,
  ImageUploadData,
  UploadResult
} from "../types/image";
import type { PaginationParams, PaginatedResponse } from "../types/api";

export class ImageApi {

  static async getUserImages(params: PaginationParams = {}): Promise<PaginatedResponse<ImageItem>> {
    const { page = 1, limit = 8 } = params;
    const response = await axiosInstance.get(`/images/my-images?page=${page}&limit=${limit}`);

    return {
      data: response.data.images || [],
      pagination: response.data.pagination
    };
  }

  static async uploadImages(files: ImageUploadData[]): Promise<UploadResult[]> {
    const formData = new FormData();

    files.forEach(({ file }) => {
      formData.append('images', file);
    });

    const response = await axiosInstance.post('/images/upload-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.images.map((img: { imageUrl: string; _id: string; s3Key: string }) => ({
      url: img.imageUrl,
      id: img._id,
      key: img.s3Key
    }));
  }
}
