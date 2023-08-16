import mongoose from "mongoose";

import { FormDefDocLean } from "./formDef.model";
import { ShopDocLean } from "./shop.model";
import { UserDocLean } from "./user.model";

export interface FormDocPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  formDefId: mongoose.Types.ObjectId | FormDefDocLean;
  body: any;
  frontUserId: mongoose.Types.ObjectId | UserDocLean;
  createdAt: Date;
}

export interface FormDocDoc extends FormDocPoJo, mongoose.Document {}
export type FormDocModel = mongoose.Model<FormDocDoc>;
export type FormDocDocLean = mongoose.LeanDocument<FormDocDoc>;

const schema = new mongoose.Schema<FormDocPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  formDefId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "FormDef",
  },
  body: {
    type: mongoose.SchemaTypes.Mixed,
    required: true,
  },
  frontUserId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<FormDocDoc, FormDocModel>("FormDoc", schema);
