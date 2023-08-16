import mongoose from "mongoose";

import { OrderDocLean } from "./order.model";
import { ShopDocLean } from "./shop.model";
import { UserDocLean } from "./user.model";

export type Status = "pending" | "active" | "cancelled" | "expired";

export interface RewardRecordPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;

  // may be, for some transactional purpose or redeempion process that order is not involved?
  // leave it optional here
  orderId?: mongoose.Types.ObjectId | OrderDocLean;

  userId: mongoose.Types.ObjectId | UserDocLean;

  // for negative, that's redeemed
  points: number;

  // for redeemed record, only active, no expired
  status: Status;

  createdAt: Date;
}

export interface RewardRecordDoc extends RewardRecordPoJo, mongoose.Document {}
export type RewardRecordModel = mongoose.Model<RewardRecordDoc>;
export type RewardRecordDocLean = mongoose.LeanDocument<RewardRecordDoc>;

export const schema = new mongoose.Schema<RewardRecordPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  orderId: {
    type: mongoose.Types.ObjectId,
    ref: "Order",
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
  points: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "active", "expired", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<RewardRecordDoc, RewardRecordModel>("Reward", schema);
