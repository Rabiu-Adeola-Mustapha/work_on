import mongoose from "mongoose";

import { ShopDocLean } from "./shop.model";

export type CounterType = "order" | "product";

export interface CounterPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  counterType: CounterType;
  seq: number;
}

export interface CounterDoc extends CounterPoJo, mongoose.Document {}
export interface CounterModel extends mongoose.Model<CounterDoc> {}
export type CounterDocLean = mongoose.LeanDocument<CounterDoc>;

export const schema = new mongoose.Schema<CounterPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  counterType: {
    type: String,
    enum: ["order", "product"],
    required: true,
  },
  seq: {
    type: Number,
    required: true,
    default: 0,
  },
});

schema.index({ shopId: 1, counterType: 1 }, { unique: true });

export default mongoose.model<CounterDoc, CounterModel>("Counter", schema);
