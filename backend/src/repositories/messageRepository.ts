import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import Message, { IMessage } from "../models/messageModel";
import { IMessageRepository } from "../interfaces/Repositories/IMessageRepository";

@injectable()
export class MessageRepository extends BaseRepository<IMessage> implements IMessageRepository {
  constructor() {
    super(Message);
  }

  async getMessages(limit: number = 20, skip: number = 0): Promise<IMessage[]> {
    const finalLimit = limit > 100 ? 100 : limit;
    return this.model.find().sort({ createdAt: -1 }).skip(skip).limit(finalLimit).exec();
  }
}
