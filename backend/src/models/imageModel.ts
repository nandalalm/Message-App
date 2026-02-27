import mongoose, { Document, Schema } from "mongoose";

export interface IImage extends Document {
  imageUrl: string;
  s3Key: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IImage>(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    s3Key: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ImageModel = mongoose.model<IImage>("Image", imageSchema);
