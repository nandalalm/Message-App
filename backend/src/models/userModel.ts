import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profileImageUrl?: string;
  profileImageKey?: string;
  mutedNotificationTypes: string[];
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profileImageUrl: { type: String },
    profileImageKey: { type: String },
    mutedNotificationTypes: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("User", userSchema);
