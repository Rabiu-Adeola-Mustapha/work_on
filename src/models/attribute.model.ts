import mongoose from "mongoose";

import { AdminUserDocLean } from "./adminUser.model";
import LocaleTextSchema, { LocaleTextDocLean } from "./locale.model";
import { ShopDocLean } from "./shop.model";

export enum AttributionType {
  string = "string",
  number = "number",
}

export interface AttributePoJo {
  shop_id: mongoose.Types.ObjectId | ShopDocLean;

  // a unique code for easy looking.  We can't use lookup for this because it has different value in differernt locale
  code: string;

  name: LocaleTextDocLean;
  type: AttributionType;
  unit: LocaleTextDocLean;
  created_at: Date;
  created_by: mongoose.Types.ObjectId | AdminUserDocLean;
}

export interface AttributeDoc extends AttributePoJo, mongoose.Document {}
export type AttributeModel = mongoose.Model<AttributeDoc>;
export type AttributeDocLean = mongoose.LeanDocument<AttributeDoc>;

const schema = new mongoose.Schema<AttributePoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  name: {
    type: LocaleTextSchema,
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(AttributionType),
    required: true,
  },
  unit: {
    type: LocaleTextSchema,
    required: function () {
      return this.type === AttributionType.number;
    },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: mongoose.Types.ObjectId,
    ref: "AdminUser",
    required: true,
  },
});

export default mongoose.model<AttributeDoc, AttributeModel>("Attribute", schema);
