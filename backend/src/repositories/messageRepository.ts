import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import Message, { IMessage } from "../models/messageModel";
import { IMessageRepository } from "../interfaces/Repositories/IMessageRepository";

@injectable()
export class MessageRepository extends BaseRepository<IMessage> implements IMessageRepository {
  constructor() {
    super(Message);
  }

  async getLatestMessages(limit: number = 100): Promise<IMessage[]> {
    const finalLimit = limit > 100 ? 100 : limit;
    return this.model.find().sort({ createdAt: -1 }).limit(finalLimit).exec();
  }
}
