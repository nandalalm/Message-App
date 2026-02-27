import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import Message, { IMessage } from "../models/messageModel";
import { IMessageRepository } from "../interfaces/Repositories/IMessageRepository";

@injectable()
export class MessageRepository extends BaseRepository<IMessage> implements IMessageRepository {
  constructor() {
    super(Message);
  }

  async getLatestMessages(limit: number = 50): Promise<IMessage[]> {
    return this.model.find().sort({ createdAt: -1 }).limit(limit).exec();
  }
}
