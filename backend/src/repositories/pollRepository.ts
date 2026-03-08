import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import Poll, { IPoll } from "../models/pollModel";
import { IPollRepository } from "../interfaces/Repositories/IPollRepository";
import { FilterQuery } from "mongoose";

@injectable()
export class PollRepository extends BaseRepository<IPoll> implements IPollRepository {
  constructor() {
    super(Poll);
  }

  async findPollsFiltered(userId: string, filterType: string, limit: number = 20, skip: number = 0): Promise<IPoll[]> {
    let query: FilterQuery<IPoll> = {};
    const now = new Date();

    switch (filterType) {
      case "active":
        query = { isActive: true, expiresAt: { $gt: now } };
        break;
      case "timedOut":
        query = { $or: [{ isActive: false }, { expiresAt: { $lte: now } }] };
        break;
      case "myPolls":
        query = { creatorId: userId };
        break;
      default:
        query = {};
    }

    const finalLimit = limit > 100 ? 100 : limit;
    return this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(finalLimit).exec();
  }

  async findActivePolls(): Promise<IPoll[]> {
    return this.findPollsFiltered("", "active");
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

  async getTodayPollCountForUser(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.model.countDocuments({
      creatorId: userId,
      createdAt: { $gte: startOfDay }
    }).exec();
  }

  async vote(pollId: string, optionIndex: number, userId: string, userName: string): Promise<IPoll | null> {
    const poll = await this.model.findById(pollId);
    if (!poll || !poll.isActive || poll.expiresAt < new Date()) return null;

    const existingVote = poll.voters.find(v => v.userId === userId && v.optionIndex === optionIndex);
    const anyExistingVote = poll.voters.find(v => v.userId === userId);

    if (poll.allowMultiple) {
      if (existingVote) {
        // Toggle OFF (Deselect)
        return this.model.findOneAndUpdate(
          { _id: pollId },
          {
            $inc: { [`options.${optionIndex}.votes`]: -1 },
            $pull: { voters: { userId, optionIndex } }
          },
          { new: true }
        ).exec();
      } else {
        // Toggle ON
        return this.model.findOneAndUpdate(
          { _id: pollId },
          {
            $inc: { [`options.${optionIndex}.votes`]: 1 },
            $push: { voters: { userId, userName, optionIndex } }
          },
          { new: true }
        ).exec();
      }
    } else {
      if (anyExistingVote) {
        if (anyExistingVote.optionIndex === optionIndex) {
          // Deselect same option
          return this.model.findOneAndUpdate(
            { _id: pollId },
            {
              $inc: { [`options.${optionIndex}.votes`]: -1 },
              $pull: { voters: { userId, optionIndex } }
            },
            { new: true }
          ).exec();
        } else {
          // Switch vote
          const oldIndex = anyExistingVote.optionIndex;
          return this.model.findOneAndUpdate(
            { _id: pollId },
            {
              $inc: {
                [`options.${oldIndex}.votes`]: -1,
                [`options.${optionIndex}.votes`]: 1
              },
              $set: { "voters.$[elem].optionIndex": optionIndex, "voters.$[elem].userName": userName }
            },
            {
              arrayFilters: [{ "elem.userId": userId }],
              new: true
            }
          ).exec();
        }
      } else {
        // Fresh vote
        return this.model.findOneAndUpdate(
          { _id: pollId },
          {
            $inc: { [`options.${optionIndex}.votes`]: 1 },
            $push: { voters: { userId, userName, optionIndex } }
          },
          { new: true }
        ).exec();
      }
    }
  }
}
