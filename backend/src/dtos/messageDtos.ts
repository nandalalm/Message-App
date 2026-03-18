export interface MessageDTO {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  editCount: number;
  imageUrl?: string;
  s3Key?: string;
  createdAt: string;
}

export interface CreateMessageDTO {
  senderId: string;
  senderName: string;
  content: string;
  imageUrl?: string;
  s3Key?: string;
}
