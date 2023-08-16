import mongoose from "mongoose";

import { CountryDocLean } from "./country.model";
import LocaleTextSchema, { LocaleTextPoJo } from "./locale.model";
import { ShopDocLean } from "./shop.model";

export interface PickupAddrPoJo {
  shop_id: mongoose.Types.ObjectId | ShopDocLean;
  country_id: mongoose.Types.ObjectId | CountryDocLean;
  addr: LocaleTextPoJo;
  tel: string;
  opening_hour: LocaleTextPoJo;
  created_at: Date;
}

export interface PickupAddrDoc extends PickupAddrPoJo, mongoose.Document {}
export type PickupAddrModel = mongoose.Model<PickupAddrDoc>;
export type PickupAddrDocLean = mongoose.LeanDocument<PickupAddrDoc>;

const schema = new mongoose.Schema<PickupAddrPoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  country_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Country",
  },
  addr: { type: LocaleTextSchema },
  tel: { type: String },
  opening_hour: {
    type: LocaleTextSchema,
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default mongoose.model<PickupAddrDoc, PickupAddrModel>("PickupAddr", schema);
