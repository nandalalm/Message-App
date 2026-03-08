import { IBaseRepository } from "./IBaseRepository";
import { IMessage } from "../../models/messageModel";

export interface IMessageRepository extends IBaseRepository<IMessage> {
  getMessages(limit: number, skip: number): Promise<IMessage[]>;
}
