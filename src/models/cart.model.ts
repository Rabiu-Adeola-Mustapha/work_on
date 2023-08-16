import mongoose from "mongoose";

import { ProductDocLean } from "./product.model";
import { ShopPoJo } from "./shop.model";
import { UserDocLean } from "./user.model";

export enum CartItemType {
  product = "product",
  discount = "discount",
}

export interface CartItemPoJo {
  type: CartItemType;
  product_id?: mongoose.Types.ObjectId | ProductDocLean;
  quantity: number; // integer only
  item_price: number;
  discount_price: number;

  //   used to track link items discounted as additional to the fully bought item
  attached_to: mongoose.Types.ObjectId | ProductDocLean;
}

export interface CartItemDoc extends CartItemPoJo, mongoose.Document {}
export type CartItemDocLean = mongoose.LeanDocument<CartItemDoc>;

export const cartItemSchema = new mongoose.Schema<CartItemPoJo>({
  type: {
    type: String,
    enum: Object.values(CartItemType),
    default: CartItemType.product,
  },
  product_id: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
  },
  quantity: {
    type: Number,
    required: true,
  },
  item_price: {
    type: Number,
    required: true,
  },
  discount_price: {
    type: Number,
  },
  attached_to: {
    type: mongoose.Types.ObjectId,
  },
});

export interface CartPoJo {
  shop_id: mongoose.Types.ObjectId | ShopPoJo;
  user_id?: mongoose.Types.ObjectId | UserDocLean;
  items: CartItemPoJo[];
  created_at: Date;
}

export interface CartDoc extends CartPoJo, mongoose.Document {}
export type CartModel = mongoose.Model<CartDoc>;
export type CartDocLean = mongoose.LeanDocument<CartDoc>;

const schema = new mongoose.Schema<CartPoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  items: {
    type: [cartItemSchema],
    required: true,
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<CartDoc, CartModel>("Cart", schema);
