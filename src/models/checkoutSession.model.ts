import mongoose from "mongoose";

import { CartItemDocLean, cartItemSchema } from "./cart.model";
import { ShopDocLean } from "./shop.model";
import { UserDocLean } from "./user.model";

export interface CheckoutSessionPoJo {
  shop_id: mongoose.Types.ObjectId | ShopDocLean;
  user_id: mongoose.Types.ObjectId | UserDocLean;
  items: CartItemDocLean[];

  // address
  // shipping
  // shipping cost

  created_at: Date;
}

export interface CheckoutSessionDoc extends CheckoutSessionPoJo, mongoose.Document {}
export type CheckoutSessionModel = mongoose.Model<CheckoutSessionDoc>;
export type CheckoutSessionDocLean = mongoose.LeanDocument<CheckoutSessionDoc>;

const schema = new mongoose.Schema<CheckoutSessionPoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
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
    required: true,
  },
});

export default mongoose.model<CheckoutSessionDoc, CheckoutSessionModel>("CheckoutSession", schema);
