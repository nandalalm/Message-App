import { injectable, inject } from "inversify";
import { IPollService } from "../interfaces/services/IPollService";
import { IPollRepository } from "../interfaces/Repositories/IPollRepository";
import { TYPES } from "../config/types";
import { PollDTO, CreatePollDTO } from "../dtos/pollDtos";
import { IPoll } from "../models/pollModel";
import { Messages } from "../constants/messages";
import mongoose from "mongoose";
import { AppError } from "../utils/AppError";
import { HttpStatus } from "../constants/httpStatus";

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
      throw new AppError(Messages.POLL_QUESTION_REQUIRED, HttpStatus.BAD_REQUEST);
    }

    if (trimmedQuestion.length < 5 || trimmedQuestion.length > 400) {
      throw new AppError(Messages.POLL_QUESTION_LENGTH, HttpStatus.BAD_REQUEST);
    }

    const filteredOptions = data.options
      ?.map(o => o.trim())
      .filter(o => o !== "") || [];

    if (filteredOptions.length < 2) {
      throw new AppError(Messages.POLL_OPTIONS_REQUIRED, HttpStatus.BAD_REQUEST);
    }

    if (filteredOptions.length > 12) {
      throw new AppError(Messages.POLL_OPTIONS_MAX, HttpStatus.BAD_REQUEST);
    }

    for (const opt of filteredOptions) {
      if (opt.length < 1 || opt.length > 100) {
        throw new AppError(Messages.POLL_OPTION_LENGTH, HttpStatus.BAD_REQUEST);
      }
    }

    const uniqueOptions = new Set(filteredOptions.map(o => o.toLowerCase()));
    if (uniqueOptions.size !== filteredOptions.length) {
      throw new AppError(Messages.POLL_DUPLICATE_OPTIONS, HttpStatus.BAD_REQUEST);
    }

    if (!data.expiresAt) {
      throw new AppError(Messages.POLL_EXPIRY_REQUIRED, HttpStatus.BAD_REQUEST);
    }

    const parsedExpiry = new Date(data.expiresAt);
    if (Number.isNaN(parsedExpiry.getTime())) {
      throw new AppError(Messages.POLL_EXPIRY_INVALID, HttpStatus.BAD_REQUEST);
    }

    if (parsedExpiry.getTime() <= Date.now()) {
      throw new AppError(Messages.POLL_EXPIRY_PAST, HttpStatus.BAD_REQUEST);
    }

    const userTodayCount = await this._pollRepository.getTodayPollCountForUser(data.creatorId);
    if (userTodayCount >= 10) {
      throw new AppError(Messages.POLL_DAILY_LIMIT, HttpStatus.BAD_REQUEST);
    }

    const poll = await this._pollRepository.create({
      creatorId: new mongoose.Types.ObjectId(data.creatorId),
      creatorName: data.creatorName,
      question: trimmedQuestion,
      options: filteredOptions.map(opt => ({ text: opt, votes: 0 })),
      allowMultiple: data.allowMultiple,
      expiresAt: parsedExpiry,
      voters: [],
    } as Partial<IPoll>);

    return this.mapToDTO(poll, data.creatorId);
  }

  async vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<PollDTO> {
    const pollToVote = await this._pollRepository.findById(pollId);
    if (!pollToVote) {
      throw new AppError(Messages.POLL_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (this.getPollExpiryDate(pollToVote).getTime() <= Date.now()) {
      throw new AppError(Messages.POLL_EXPIRED, HttpStatus.GONE);
    }

    if (optionIndex < 0 || optionIndex >= pollToVote.options.length) {
      throw new AppError(Messages.POLL_OPTION_INVALID, HttpStatus.BAD_REQUEST);
    }

    const poll = await this._pollRepository.vote(pollId, optionIndex, userId, userName);
    if (!poll) {
      const refreshedPoll = await this._pollRepository.findById(pollId);
      if (!refreshedPoll) {
        throw new AppError(Messages.POLL_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      if (this.getPollExpiryDate(refreshedPoll).getTime() <= Date.now()) {
        throw new AppError(Messages.POLL_EXPIRED, HttpStatus.GONE);
      }

      throw new AppError(Messages.VOTE_FAILED, HttpStatus.BAD_REQUEST);
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
    const pollExpiryDate = this.getPollExpiryDate(poll);

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
      expiresAt: pollExpiryDate.toISOString(),
      isExpired: pollExpiryDate.getTime() <= Date.now(),
      hasVoted: poll.voters.some(v => v.userId === userId),
      votedOptionIndices: poll.voters.filter(v => v.userId === userId).map(v => v.optionIndex),
      voters: poll.voters.map(v => ({ userId: v.userId.toString(), userName: v.userName, optionIndex: v.optionIndex }))
    };
  }

  private getPollExpiryDate(poll: IPoll): Date {
    if (poll.expiresAt instanceof Date && !Number.isNaN(poll.expiresAt.getTime())) {
      return poll.expiresAt;
    }

    if (poll.createdAt instanceof Date && !Number.isNaN(poll.createdAt.getTime())) {
      return poll.createdAt;
    }

    return new Date(0);
  }
}
