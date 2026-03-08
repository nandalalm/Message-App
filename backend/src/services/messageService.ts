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
      imageUrl: data.imageUrl,
      s3Key: data.s3Key,
    } as Partial<IMessage>);

    return this.mapToDTO(message);
  }

  async editMessage(userId: string, messageId: string, content: string): Promise<MessageDTO> {
    const message = await this._messageRepository.findById(messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId.toString() !== userId) throw new Error("Unauthorized to edit this message");
    if (message.imageUrl) throw new Error("Image messages cannot be edited");
    if (message.editCount >= 1) throw new Error("Message can only be edited once");

    message.content = content;
    message.isEdited = true;
    message.editCount += 1;
    await message.save();

    return this.mapToDTO(message);
  }

  async deleteMessage(userId: string, messageId: string): Promise<MessageDTO> {
    const message = await this._messageRepository.findById(messageId);
    if (!message) throw new Error("Message not found");
    if (message.senderId.toString() !== userId) throw new Error("Unauthorized to delete this message");

    message.isDeleted = true;
    message.content = "This message was deleted";
    await message.save();
    return this.mapToDTO(message);
  }

  async getChatHistory(limit: number = 20, skip: number = 0): Promise<MessageDTO[]> {
    const messages = await this._messageRepository.getMessages(limit, skip);
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
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      editCount: message.editCount,
      imageUrl: message.imageUrl,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
