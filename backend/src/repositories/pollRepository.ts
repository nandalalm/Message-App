import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import Poll, { IPoll } from "../models/pollModel";
import { IPollRepository } from "../interfaces/Repositories/IPollRepository";

@injectable()
export class PollRepository extends BaseRepository<IPoll> implements IPollRepository {
  constructor() {
    super(Poll);
  }

  async findActivePolls(): Promise<IPoll[]> {
    return this.model.find({ isActive: true, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).exec();
  }

  async getActivePollCount(): Promise<number> {
    return this.model.countDocuments({ isActive: true, expiresAt: { $gt: new Date() } }).exec();
  }

  async getUserActivePollCount(userId: string): Promise<number> {
    return this.model.countDocuments({
      creatorId: userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).exec();
  }

  async vote(pollId: string, optionIndex: number, userId: string): Promise<IPoll | null> {
    const poll = await this.model.findById(pollId);
    if (!poll || !poll.isActive || poll.expiresAt < new Date()) return null;

    const hasVotedThisOption = poll.voters.some(v => v.userId === userId && v.optionIndex === optionIndex);
    const hasVotedAnyOption = poll.voters.some(v => v.userId === userId);

    if (poll.allowMultiple) {
      if (hasVotedThisOption) return null;
    } else {
      if (hasVotedAnyOption) return null;
    }

    return this.model.findOneAndUpdate(
      { _id: pollId },
      {
        $inc: { [`options.${optionIndex}.votes`]: 1 },
        $push: { voters: { userId, optionIndex } }
      },
      { new: true }
    ).exec();
  }
}
