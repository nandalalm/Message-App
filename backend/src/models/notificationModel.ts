import mongoose, { Schema, Document } from "mongoose";

export type NotificationType = "message" | "poll";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  content: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["message", "poll"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const MessageNotificationModel = mongoose.model<INotification>(
  "MessageNotification",
  new Schema(NotificationSchema.obj, { 
    timestamps: true,
    capped: { size: 1024 * 1024, max: 100 } 
  })
);

export const PollNotificationModel = mongoose.model<INotification>(
  "PollNotification",
  new Schema(NotificationSchema.obj, { 
    timestamps: true,
    capped: { size: 1024 * 1024, max: 100 } 
  })
);

export default MessageNotificationModel;
