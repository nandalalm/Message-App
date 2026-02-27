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
  allowMultiple: boolean;
  voters: { userId: string; optionIndex: number }[]; // Track who voted for what
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
    allowMultiple: {
      type: Boolean,
      default: false,
    },
    voters: [
      {
        userId: { type: String, required: true },
        optionIndex: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPoll>("Poll", PollSchema);
