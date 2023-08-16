import mongoose from "mongoose";

import { CategoryDocLean } from "./category.model";
import { ProductDocLean } from "./product.model";
import { ShopDocLean } from "./shop.model";

type ProductsScope = "global" | "cats" | "products";
type Placement = "product" | "checkout";
type DiscountType = "fixed" | "percentage";

export interface DiscountProductPoJo {
  productId: mongoose.Types.ObjectId | ProductDocLean;
  discountType: DiscountType;
  discountPrice?: number;
  discountPercentage?: number;
}

export interface DiscountProductDoc extends DiscountProductPoJo, mongoose.Document {}
export type DiscountProductDocLean = mongoose.LeanDocument<DiscountProductDoc>;

export const discountProductSchema = new mongoose.Schema<DiscountProductPoJo>({
  productId: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  discountType: {
    type: String,
    required: true,
  },
  discountPrice: {
    type: Number,
  },
  discountPercentage: {
    type: Number,
  },
});

export interface DiscountGroupPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;

  // it's an internal name.  no need for locale
  name: string;

  placement: Placement;
  productsScope: ProductsScope;

  // global, checkout: both catIds and productIds should be null
  // cats: productIds should be null
  // products: cats should be null
  attachToCatIds: mongoose.Types.ObjectId[] | CategoryDocLean[]; // be aware of tree hirerarchy.  parent ids should apply to all child ids
  attachToProductIds: mongoose.Types.ObjectId[] | ProductDocLean[];

  // list of discount products that is going to show
  discountProducts: DiscountProductDocLean[];

  createdAt: Date;
}

export interface DiscountGroupDoc extends DiscountGroupPoJo, mongoose.Document {}
export type DiscountGroupModel = mongoose.Model<DiscountGroupDoc>;
export type DiscountGroupDocLean = mongoose.LeanDocument<DiscountGroupDoc>;

export const schema = new mongoose.Schema<DiscountGroupPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  placement: {
    type: String,
    required: true,
    enum: ["product", "checkout"],
  },
  productsScope: {
    type: String,
    required: true,
    enum: ["global", "cats", "products"],
  },
  attachToCatIds: {
    type: [mongoose.Types.ObjectId],
    ref: "Category",
    default: [],
  },
  attachToProductIds: {
    type: [mongoose.Types.ObjectId],
    ref: "Product",
    default: [],
  },
  discountProducts: {
    type: [discountProductSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<DiscountGroupDoc, DiscountGroupModel>("DiscountGroup", schema);
