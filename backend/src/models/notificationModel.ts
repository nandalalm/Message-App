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

const MessageNotificationSchema = new Schema(NotificationSchema.obj, {
  timestamps: true,
  capped: { size: 1024 * 1024, max: 100 }
});

MessageNotificationSchema.index({ userId: 1, createdAt: -1 });

const PollNotificationSchema = new Schema(NotificationSchema.obj, {
  timestamps: true,
  capped: { size: 1024 * 1024, max: 100 }
});

PollNotificationSchema.index({ userId: 1, createdAt: -1 });
PollNotificationSchema.index(
  { userId: 1, type: 1, relatedId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      relatedId: { $exists: true, $type: "string" }
    }
  }
);

export const MessageNotificationModel = mongoose.model<INotification>(
  "MessageNotification",
  MessageNotificationSchema
);

export const PollNotificationModel = mongoose.model<INotification>(
  "PollNotification",
  PollNotificationSchema
);

export default MessageNotificationModel;
