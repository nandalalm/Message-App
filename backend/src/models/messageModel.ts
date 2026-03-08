import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  content: string;
  senderName: string;
  isEdited: boolean;
  isDeleted: boolean;
  editCount: number;
  imageUrl?: string;
  s3Key?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    editCount: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
    },
    s3Key: {
      type: String,
    },
  },
  {
    timestamps: true,
    capped: { size: 1024 * 1024, max: 100 } // 1MB size limit or 100 documents
  }
);

export default mongoose.model<IMessage>("Message", MessageSchema);
