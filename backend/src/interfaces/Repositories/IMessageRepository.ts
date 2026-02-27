import { IBaseRepository } from "./IBaseRepository";
import { IMessage } from "../../models/messageModel";

export interface IMessageRepository extends IBaseRepository<IMessage> {
  getLatestMessages(limit: number): Promise<IMessage[]>;
}
