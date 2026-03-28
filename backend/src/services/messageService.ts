import { injectable, inject } from "inversify";
import { IMessageService } from "../interfaces/services/IMessageService";
import { IMessageRepository } from "../interfaces/Repositories/IMessageRepository";
import { IImageService } from "../interfaces/services/IImageService";
import { TYPES } from "../config/types";
import { MessageDTO, CreateMessageDTO } from "../dtos/messageDtos";
import { IMessage } from "../models/messageModel";
import { Messages } from "../constants/messages";
import mongoose from "mongoose";

@injectable()
export class MessageService implements IMessageService {
  private _messageRepository: IMessageRepository;
  private _imageService: IImageService;

  constructor(
    @inject(TYPES.MessageRepository) messageRepository: IMessageRepository,
    @inject(TYPES.ImageService) imageService: IImageService
  ) {
    this._messageRepository = messageRepository;
    this._imageService = imageService;
  }

  async saveMessage(data: CreateMessageDTO): Promise<MessageDTO> {
    const message = await this._messageRepository.create({
      senderId: new mongoose.Types.ObjectId(data.senderId),
      senderName: data.senderName,
      content: data.content,
      imageUrl: data.imageUrl,
      s3Key: data.s3Key,
    } as Partial<IMessage>);
    
    return await this.mapToDTO(message);
  }

  async editMessage(userId: string, messageId: string, content: string): Promise<MessageDTO> {
    const message = await this._messageRepository.findById(messageId);
    if (!message) throw new Error(Messages.MESSAGE_NOT_FOUND);
    if (message.senderId.toString() !== userId) throw new Error(Messages.UNAUTHORIZED_EDIT);
    if (message.imageUrl) throw new Error(Messages.IMAGE_EDIT_NOT_ALLOWED);
    if (message.editCount >= 1) throw new Error(Messages.EDIT_LIMIT_REACHED);

    message.content = content;
    message.isEdited = true;
    message.editCount += 1;
    await message.save();

    return await this.mapToDTO(message);
  }

  async deleteMessage(userId: string, messageId: string): Promise<MessageDTO> {
    const message = await this._messageRepository.findById(messageId);
    if (!message) throw new Error(Messages.MESSAGE_NOT_FOUND);
    if (message.senderId.toString() !== userId) throw new Error(Messages.UNAUTHORIZED_DELETE);

    message.isDeleted = true;
    message.content = Messages.MESSAGE_DELETED_CONTENT;
    await message.save();
    return await this.mapToDTO(message);
  }

  async getChatHistory(limit: number = 20, skip: number = 0): Promise<MessageDTO[]> {
    const messages = await this._messageRepository.getMessages(limit, skip);
    const sortedMessages = messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    return Promise.all(sortedMessages.map(msg => this.mapToDTO(msg)));
  }

  private async mapToDTO(message: IMessage): Promise<MessageDTO> {
    let freshImageUrl = message.imageUrl;

    if (message.s3Key && !message.isDeleted) {
      try {
        freshImageUrl = await this._imageService.generateSignedUrl(message.s3Key);
      } catch (error) {
        console.error(error);
      }
    }

    return {
      id: message._id as string,
      senderId: message.senderId.toString(),
      senderName: message.senderName,
      content: message.content,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      editCount: message.editCount,
      imageUrl: freshImageUrl,
      s3Key: message.s3Key,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
