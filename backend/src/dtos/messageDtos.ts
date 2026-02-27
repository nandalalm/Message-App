export interface MessageDTO {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface CreateMessageDTO {
  senderId: string;
  senderName: string;
  content: string;
}
