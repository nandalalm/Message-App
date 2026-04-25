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
  allowMultiple: boolean;
  expiresAt: Date;
  voters: { userId: string; userName: string; optionIndex: number }[];
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
    allowMultiple: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    voters: [
      {
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        optionIndex: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
    capped: { size: 5 * 1024 * 1024, max: 100 }
  }
);

export default mongoose.model<IPoll>("Poll", PollSchema);
