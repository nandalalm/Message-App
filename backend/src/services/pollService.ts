import { injectable, inject } from "inversify";
import { IPollService } from "../interfaces/services/IPollService";
import { IPollRepository } from "../interfaces/Repositories/IPollRepository";
import { TYPES } from "../config/types";
import { PollDTO, CreatePollDTO } from "../dtos/pollDtos";
import { IPoll } from "../models/pollModel";
import { Messages } from "../constants/messages";
import mongoose from "mongoose";

@injectable()
export class PollService implements IPollService {
  private _pollRepository: IPollRepository;

  constructor(
    @inject(TYPES.PollRepository) pollRepository: IPollRepository
  ) {
    this._pollRepository = pollRepository;
  }

  async createPoll(data: CreatePollDTO): Promise<PollDTO> {
    const trimmedQuestion = data.question?.trim();
    if (!trimmedQuestion) {
      throw new Error(Messages.POLL_QUESTION_REQUIRED);
    }

    if (trimmedQuestion.length < 5 || trimmedQuestion.length > 200) {
      throw new Error(Messages.POLL_QUESTION_LENGTH);
    }

    const filteredOptions = data.options
      ?.map(o => o.trim())
      .filter(o => o !== "") || [];

    if (filteredOptions.length < 2) {
      throw new Error(Messages.POLL_OPTIONS_REQUIRED);
    }

    if (filteredOptions.length > 12) {
      throw new Error(Messages.POLL_OPTIONS_MAX);
    }

    for (const opt of filteredOptions) {
      if (opt.length < 1 || opt.length > 100) {
        throw new Error(Messages.POLL_OPTION_LENGTH);
      }
    }

    const uniqueOptions = new Set(filteredOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== filteredOptions.length) {
      throw new Error(Messages.POLL_DUPLICATE_OPTIONS);
    }

    const userTodayCount = await this._pollRepository.getTodayPollCountForUser(data.creatorId);
    if (userTodayCount >= 10) {
      throw new Error("Daily poll limit (10) reached. You can create more polls tomorrow.");
    }


    const poll = await this._pollRepository.create({
      creatorId: new mongoose.Types.ObjectId(data.creatorId),
      creatorName: data.creatorName,
      question: data.question,
      options: data.options.map(opt => ({ text: opt, votes: 0 })),
      allowMultiple: data.allowMultiple,
      voters: [],
    } as Partial<IPoll>);


    return this.mapToDTO(poll, data.creatorId);
  }

  async vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<PollDTO> {
    const poll = await this._pollRepository.vote(pollId, optionIndex, userId, userName);
    if (!poll) {
      throw new Error("Unable to vote. Poll may be inactive or concluded.");
    }
    return this.mapToDTO(poll, userId);
  }

  async getFilteredPolls(userId: string, filterType: string, limit: number = 20, skip: number = 0): Promise<PollDTO[]> {
    const polls = await this._pollRepository.findPollsFiltered(userId, filterType, limit, skip);
    return polls.map(poll => this.mapToDTO(poll, userId));
  }
  
  async getPollById(pollId: string, userId: string): Promise<PollDTO | null> {
    const poll = await this._pollRepository.findById(pollId);
    if (!poll) return null;
    return this.mapToDTO(poll, userId);
  }

  private mapToDTO(poll: IPoll, userId: string): PollDTO {
    return {
      id: poll._id as string,
      creatorId: poll.creatorId.toString(),
      creatorName: poll.creatorName,
      question: poll.question,
      options: poll.options.map(opt => ({
        text: opt.text,
        votes: opt.votes
      })),
      allowMultiple: poll.allowMultiple,
      hasVoted: poll.voters.some(v => v.userId === userId),
      votedOptionIndices: poll.voters.filter(v => v.userId === userId).map(v => v.optionIndex),
      voters: poll.voters.map(v => ({ userId: v.userId.toString(), userName: v.userName, optionIndex: v.optionIndex }))
    };
  }
}
