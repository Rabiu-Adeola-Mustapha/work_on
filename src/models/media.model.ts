import mongoose from "mongoose";

import { AdminUserDocLean } from "./adminUser.model";
import { ShopDocLean } from "./shop.model";

export interface MediaPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  filename: string;
  originalFilename: string;
  width: number;
  height: number;
  url: string;
  size: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId | AdminUserDocLean;
}

export interface MediaDoc extends MediaPoJo, mongoose.Document {}
export type MediaModel = mongoose.Model<MediaDoc>;
export type MediaDocLean = mongoose.LeanDocument<MediaDoc>;

const schema = new mongoose.Schema<MediaPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  filename: {
    type: String,
    required: true,
  },
  originalFilename: {
    type: String,
    required: true,
  },
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnailUrl: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
  thumbnailWidth: {
    type: Number,
    required: true,
  },
  thumbnailHeight: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Types.ObjectId,
    ref: "AdminUser",
    required: true,
  },
});

schema.index({ shop_id: 1, filename: 1 }, { unique: true });

export function resMedia(media: MediaDocLean) {
  if (!media) return undefined;

  return {
    id: media._id,
    height: media.height,
    width: media.width,
    url: media.url,
    filename: media.filename,
    size: media.size,
    thumbnailUrl: media.thumbnailUrl,
    thumbnailHeight: media.thumbnailHeight,
    thumbnailWidth: media.thumbnailWidth,
  };
}

export default mongoose.model<MediaDoc, MediaModel>("Media", schema);
