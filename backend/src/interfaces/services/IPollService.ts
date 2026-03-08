import { PollDTO, CreatePollDTO } from "../../dtos/pollDtos";

export interface IPollService {
  createPoll(data: CreatePollDTO): Promise<PollDTO>;
  vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<PollDTO>;
  getFilteredPolls(userId: string, filterType: string, limit: number, skip: number): Promise<PollDTO[]>;
}
