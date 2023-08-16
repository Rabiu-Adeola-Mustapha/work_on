import mongoose from "mongoose";

import { AttributeDocLean } from "./attribute.model";
import { LocaleTextDocLean } from "./locale.model";

export interface ProductAttributePoJo {
  attribute_id: mongoose.Types.ObjectId | AttributeDocLean;
  value: LocaleTextDocLean | number;
  created_at: Date;
}

export interface ProductAttributeDoc extends ProductAttributePoJo, mongoose.Document {}
export type ProductAttributeModel = mongoose.Model<ProductAttributeDoc>;
export type ProductAttributeDocLean = mongoose.LeanDocument<ProductAttributeDoc>;

export const ProductAttributeSchema = new mongoose.Schema<ProductAttributePoJo>({
  attribute_id: {
    type: mongoose.Types.ObjectId,
    ref: "Attribute",
    required: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});
