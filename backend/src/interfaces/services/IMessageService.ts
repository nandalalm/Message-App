import { MessageDTO, CreateMessageDTO } from "../../dtos/messageDtos";

export interface IMessageService {
  saveMessage(data: CreateMessageDTO): Promise<MessageDTO>;
  getChatHistory(limit?: number): Promise<MessageDTO[]>;
}
