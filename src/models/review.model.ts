import mongoose from "mongoose";

import { OrderDocLean } from "./order.model";
import { ProductDocLean } from "./product.model";
import { ShopDocLean } from "./shop.model";
import { UserDocLean } from "./user.model";

export interface ReviewPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  orderId?: mongoose.Types.ObjectId | OrderDocLean;
  userId: mongoose.Types.ObjectId | UserDocLean;
  productId: mongoose.Types.ObjectId | ProductDocLean;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface ReviewDoc extends ReviewPoJo, mongoose.Document {}
export type ReviewModel = mongoose.Model<ReviewDoc>;
export type ReviewDocLean = mongoose.LeanDocument<ReviewDoc>;

export const schema = new mongoose.Schema<ReviewPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  productId: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
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
  rating: {
    type: Number,
    required: true,
  },
  comment: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<ReviewDoc, ReviewModel>("Review", schema);
