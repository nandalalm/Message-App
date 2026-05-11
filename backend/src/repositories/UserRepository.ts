import { injectable } from "inversify";
import { BaseRepository } from "./BaseRepository";
import { IUserRepository } from "../interfaces/Repositories/IUserRepository"
import { IUser, UserModel } from "../models/userModel";

@injectable()
export class UserRepository extends BaseRepository<IUser> implements IUserRepository {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email });
  }

  async findByUsername(username: string): Promise<IUser | null> {
    return this.model.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } });
  }

  async createUser(user: IUser): Promise<IUser> {
    return this.create(user);
  }

  async updateProfileImage(id: string, url: string, key: string): Promise<IUser | null> {
    return this.update(id, { $set: { profileImageUrl: url, profileImageKey: key } });
  }

  async clearProfileImage(id: string): Promise<IUser | null> {
    return this.update(id, { $unset: { profileImageUrl: "", profileImageKey: "" } });
  }

  async updatePasswordByEmail(email: string, passwordHash: string): Promise<void> {
    await this.model.updateOne({ email }, { $set: { password: passwordHash } });
  }
}
