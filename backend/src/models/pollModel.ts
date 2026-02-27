import mongoose, { Schema, Document } from "mongoose";

export interface IPollOption {
  text: string;
  votes: number;
}

export interface IPoll extends Document {
  creatorId: mongoose.Types.ObjectId;
  creatorName: string;
  question: string;
  options: IPollOption[];
  expiresAt: Date;
  isActive: boolean;
  votedUserIds: string[]; // Store IDs of users who have already voted
  createdAt: Date;
  updatedAt: Date;
}

const PollSchema: Schema = new Schema(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorName: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    votedUserIds: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPoll>("Poll", PollSchema);
