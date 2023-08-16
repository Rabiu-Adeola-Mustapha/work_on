import mongoose from "mongoose";

import { MediaDocLean } from "./media.model";
import { ShopDocLean } from "./shop.model";

// Steps for Admin:
// 1. Model
// 2. Node Level Test (admin)
// 3. Service implementation (admin)
// 4. admin UI

// Steps for Front:
// 1. Node Level Test (front)
// 2. Serivce Implementation (front)
// 3. Code changes in front (many)

export interface BannerPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  groupName: string; // header and footer for now, add more later if needed.
  mediaId: mongoose.Types.ObjectId | MediaDocLean;
  href?: string;
  order: number;

  createdAt?: Date;
}

export interface BannerDoc extends BannerPoJo, mongoose.Document {}
export type BannerModel = mongoose.Model<BannerDoc>;
export type BannerDocLean = mongoose.LeanDocument<BannerDoc>;

export const schema = new mongoose.Schema<BannerPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  groupName: {
    type: String,
    required: true,
  },
  mediaId: {
    type: mongoose.Types.ObjectId,
    ref: "Media",
    required: true,
  },
  order: {
    type: Number,
    required: true,
  },
  href: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

schema.index({ shopId: 1, mediaId: 1 }, { unique: true });

export default mongoose.model<BannerDoc, BannerModel>("Banner", schema);
