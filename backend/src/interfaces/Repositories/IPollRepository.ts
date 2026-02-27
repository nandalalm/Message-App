import { IBaseRepository } from "./IBaseRepository";
import { IPoll } from "../../models/pollModel";

export interface IPollRepository extends IBaseRepository<IPoll> {
  findActivePolls(): Promise<IPoll[]>;
  getActivePollCount(): Promise<number>;
  getUserActivePollCount(userId: string): Promise<number>;
  vote(pollId: string, optionIndex: number, userId: string): Promise<IPoll | null>;
}
