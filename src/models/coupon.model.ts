import mongoose from "mongoose";

import { ShopDocLean } from "./shop.model";

export type CouponType = "percent" | "fixed";

export interface CouponPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  code: string;
  type: CouponType;
  amount: number;
  usageLimit: number;
  usedCount: number;
  expirationDate: Date;
  createdAt: Date;
}

export interface CouponDoc extends CouponPoJo, mongoose.Document {}
export type CouponModel = mongoose.Model<CouponDoc>;
export type CouponDocLean = mongoose.LeanDocument<CouponDoc>;

export const schema = new mongoose.Schema<CouponPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["percent", "fixed"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  usedCount: {
    type: Number,
    required: true,
    default: 0,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<CouponDoc, CouponModel>("Coupon", schema);
