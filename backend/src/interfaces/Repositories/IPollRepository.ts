import { IBaseRepository } from "./IBaseRepository";
import { IPoll } from "../../models/pollModel";

export interface IPollRepository extends IBaseRepository<IPoll> {
  findActivePolls(): Promise<IPoll[]>;
  getActivePollCount(): Promise<number>;
  getUserActivePollCount(userId: string): Promise<number>;
  getTodayPollCountForUser(userId: string): Promise<number>;
  findPollsFiltered(userId: string, filterType: string, limit: number, skip: number): Promise<IPoll[]>;
  vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<IPoll | null>;
}
