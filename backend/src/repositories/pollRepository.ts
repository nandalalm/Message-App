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
    switch (filterType) {
      case "myPolls":
        query = { creatorId: userId };
        break;
      case "active":
        query = { expiresAt: { $gt: new Date() } };
        break;
      default:
        query = {};
    }

    const finalLimit = limit > 100 ? 100 : limit;
    return this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(finalLimit).exec();
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
    const pollExpiryDate = poll ? this.getPollExpiryDate(poll) : null;
    if (!poll || !pollExpiryDate || pollExpiryDate.getTime() <= Date.now()) return null;

    const activePollFilter: FilterQuery<IPoll> = {
      _id: pollId,
      expiresAt: { $gt: new Date() }
    };

    const existingVote = poll.voters.find(v => v.userId === userId && v.optionIndex === optionIndex);
    const anyExistingVote = poll.voters.find(v => v.userId === userId);

    if (poll.allowMultiple) {
      if (existingVote) {
        return this.model.findOneAndUpdate(
          activePollFilter,
          {
            $inc: { [`options.${optionIndex}.votes`]: -1 },
            $pull: { voters: { userId, optionIndex } }
          },
          { new: true }
        ).exec();
      } else {
        return this.model.findOneAndUpdate(
          activePollFilter,
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
          return this.model.findOneAndUpdate(
            activePollFilter,
            {
              $inc: { [`options.${optionIndex}.votes`]: -1 },
              $pull: { voters: { userId, optionIndex } }
            },
            { new: true }
          ).exec();
        } else {
          const oldIndex = anyExistingVote.optionIndex;
          return this.model.findOneAndUpdate(
            activePollFilter,
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
        return this.model.findOneAndUpdate(
          activePollFilter,
          {
            $inc: { [`options.${optionIndex}.votes`]: 1 },
            $push: { voters: { userId, userName, optionIndex } }
          },
          { new: true }
        ).exec();
      }
    }
  }

  private getPollExpiryDate(poll: IPoll): Date | null {
    if (poll.expiresAt instanceof Date && !Number.isNaN(poll.expiresAt.getTime())) {
      return poll.expiresAt;
    }

    if (poll.createdAt instanceof Date && !Number.isNaN(poll.createdAt.getTime())) {
      return poll.createdAt;
    }

    return null;
  }
}
