import mongoose from "mongoose";

import { ProductDocLean } from "./product.model";
import { ShopPoJo } from "./shop.model";
import { UserDocLean } from "./user.model";

export interface WishListPoJo {
  shopId: mongoose.Types.ObjectId | ShopPoJo;
  userId?: mongoose.Types.ObjectId | UserDocLean;
  productIds: mongoose.Types.ObjectId[] | ProductDocLean[];
  createdAt: Date;
}

export interface WishListDoc extends WishListPoJo, mongoose.Document {}
export type WishListModel = mongoose.Model<WishListDoc>;
export type WishListDocLean = mongoose.LeanDocument<WishListDoc>;

const schema = new mongoose.Schema<WishListPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  productIds: {
    type: [mongoose.Types.ObjectId],
    ref: "Product",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<WishListDoc, WishListModel>("WishList", schema);
