export interface ImageItem {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export interface ImageUploadData {
  file: File;
}

export interface UploadResult {
  url: string;
  id: string;
  key: string;
}

export interface DeleteAllResponse {
  message: string;
  deletedCount: number;
}
