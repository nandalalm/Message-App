import { injectable, inject } from "inversify";
import { IPollService } from "../interfaces/services/IPollService";
import { IPollRepository } from "../interfaces/Repositories/IPollRepository";
import { TYPES } from "../config/types";
import { PollDTO, CreatePollDTO } from "../dtos/pollDtos";
import { IPoll } from "../models/pollModel";
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
    // 1. Validate global limit (max 10 active polls)
    const activeCount = await this._pollRepository.getActivePollCount();
    if (activeCount >= 10) {
      throw new Error("Global limit of 10 active polls reached.");
    }

    // 2. Validate user limit (max 1 active poll per user)
    const userActiveCount = await this._pollRepository.getUserActivePollCount(data.creatorId);
    if (userActiveCount >= 1) {
      throw new Error("You already have an active poll.");
    }

    // 3. Validate duration (max 30 mins)
    const duration = Math.min(data.durationMinutes, 30);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + duration);

    const poll = await this._pollRepository.create({
      creatorId: new mongoose.Types.ObjectId(data.creatorId),
      creatorName: data.creatorName,
      question: data.question,
      options: data.options.map(opt => ({ text: opt, votes: 0 })),
      expiresAt,
      isActive: true,
      allowMultiple: data.allowMultiple,
      voters: [],
    } as Partial<IPoll>);

    return this.mapToDTO(poll, data.creatorId);
  }

  async vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<PollDTO> {
    const poll = await this._pollRepository.vote(pollId, optionIndex, userId, userName);
    if (!poll) {
      throw new Error("Unable to vote. Poll may be inactive.");
    }
    return this.mapToDTO(poll, userId);
  }

  async getActivePolls(userId: string): Promise<PollDTO[]> {
    const polls = await this._pollRepository.findActivePolls();
    return polls.map(poll => this.mapToDTO(poll, userId));
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
      expiresAt: poll.expiresAt.toISOString(),
      isActive: poll.isActive && poll.expiresAt > new Date(),
      allowMultiple: poll.allowMultiple,
      hasVoted: poll.voters.some(v => v.userId === userId),
      votedOptionIndices: poll.voters.filter(v => v.userId === userId).map(v => v.optionIndex),
      voters: poll.voters.map(v => ({ userName: v.userName, optionIndex: v.optionIndex }))
    };
  }
}
