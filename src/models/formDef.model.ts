import mongoose from "mongoose";

import { ShopDocLean } from "./shop.model";

export interface FormDefPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  code: string;
  notifyEmails: string[];
  createdAt: Date;
}

export interface FormDefDoc extends FormDefPoJo, mongoose.Document {}
export type FormDefModel = mongoose.Model<FormDefDoc>;
export type FormDefDocLean = mongoose.LeanDocument<FormDefDoc>;

const schema = new mongoose.Schema<FormDefPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  code: {
    type: String,
    required: true,
  },
  notifyEmails: {
    type: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

schema.index({ shopId: 1, code: 1 }, { unique: true });

export default mongoose.model<FormDefDoc, FormDefModel>("formDef", schema);
