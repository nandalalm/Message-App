import { MessageDTO, CreateMessageDTO } from "../../dtos/messageDtos";

export interface IMessageService {
  saveMessage(data: CreateMessageDTO): Promise<MessageDTO>;
  getChatHistory(limit?: number, skip?: number): Promise<MessageDTO[]>;
  editMessage(userId: string, messageId: string, content: string): Promise<MessageDTO>;
  deleteMessage(userId: string, messageId: string): Promise<MessageDTO>;
}
