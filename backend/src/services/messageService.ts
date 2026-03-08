import { injectable, inject } from "inversify";
import { IMessageService } from "../interfaces/services/IMessageService";
import { IMessageRepository } from "../interfaces/Repositories/IMessageRepository";
import { TYPES } from "../config/types";
import { MessageDTO, CreateMessageDTO } from "../dtos/messageDtos";
import { IMessage } from "../models/messageModel";
import mongoose from "mongoose";

@injectable()
export class MessageService implements IMessageService {
  private _messageRepository: IMessageRepository;

  constructor(
    @inject(TYPES.MessageRepository) messageRepository: IMessageRepository
  ) {
    this._messageRepository = messageRepository;
  }

  async saveMessage(data: CreateMessageDTO): Promise<MessageDTO> {
    const message = await this._messageRepository.create({
      senderId: new mongoose.Types.ObjectId(data.senderId),
      senderName: data.senderName,
      content: data.content,
    } as Partial<IMessage>);

    return this.mapToDTO(message);
  }

  async getChatHistory(limit: number = 20, skip: number = 0): Promise<MessageDTO[]> {
    const messages = await this._messageRepository.getMessages(limit, skip);
    // Sort by createdAt ascending for the frontend context
    return messages
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(msg => this.mapToDTO(msg));
  }

  private mapToDTO(message: IMessage): MessageDTO {
    return {
      id: message._id as string,
      senderId: message.senderId.toString(),
      senderName: message.senderName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
