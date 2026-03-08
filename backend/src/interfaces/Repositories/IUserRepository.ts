import { IUser } from "../../models/userModel";
import { IBaseRepository } from "./IBaseRepository";

export interface IUserRepository extends IBaseRepository<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  createUser(user: IUser): Promise<IUser>;
  updateProfileImage(id: string, url: string, key: string): Promise<IUser | null>;
  clearProfileImage(id: string): Promise<IUser | null>;
  updatePasswordByEmail(email: string, passwordHash: string): Promise<void>;
}
