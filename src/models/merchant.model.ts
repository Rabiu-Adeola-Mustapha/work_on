import mongoose from "mongoose";

import LocaleTextSchema, { LocaleTextPoJo } from "./locale.model";
import { MediaDocLean } from "./media.model";
import { MerchantUserDocLean, MerchantUserSchema } from "./merchantUser.model";
import { ShopDocLean } from "./shop.model";

export interface MerchantRequestType {
  // name: string;
  shop_id: any;
}

export interface MerchantPoJo {
  name: LocaleTextPoJo;
  shop_id: mongoose.Types.ObjectId | ShopDocLean;
  users: MerchantUserDocLean[];
  logo_media_id: mongoose.Types.ObjectId | MediaDocLean;
  created_at: Date;
}

export interface MerchantDoc extends MerchantPoJo, mongoose.Document {}
export type MerchantModel = mongoose.Model<MerchantDoc>;
export type MerchantDocLean = mongoose.LeanDocument<MerchantDoc>;

const schema = new mongoose.Schema<MerchantPoJo>({
  name: {
    type: LocaleTextSchema,
    required: true,
  },
  shop_id: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  users: {
    type: [MerchantUserSchema],
    default: [],
  },
  logo_media_id: {
    type: mongoose.Types.ObjectId,
    ref: "Media",
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default mongoose.model<MerchantDoc, MerchantModel>("Merchant", schema);
