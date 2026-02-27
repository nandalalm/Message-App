import { PollDTO, CreatePollDTO } from "../../dtos/pollDtos";

export interface IPollService {
  createPoll(data: CreatePollDTO): Promise<PollDTO>;
  vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<PollDTO>;
  getActivePolls(userId: string): Promise<PollDTO[]>;
}
