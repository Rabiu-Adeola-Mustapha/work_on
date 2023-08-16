import mongoose from "mongoose";

import { CountryDocLean } from "./country.model";
import localeTextSchema, { LocaleTextDocLean } from "./locale.model";
import { ShipType } from "./shipSetting.model";
import { ShopDocLean } from "./shop.model";

// There are 2 types of COD
// 1. Pay offline using Payme or FPS, need to show QR Code, and provide a submit form
// 2. Payment will be collected upon delivery.
export type PayType = "paypal" | "stripe" | "cod";

export interface PaySettingPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  name: LocaleTextDocLean;
  payType: PayType;
  shipTypes?: ShipType[]; // if not set, that means this applies to all ship type
  countryIds: mongoose.Types.ObjectId[] | CountryDocLean[]; // if not set, that means this applies to all ship type
  setting: PaypalSetting | StripeSetting | CodSetting;
  isActive: boolean;
  createdAt: Date;
}

export interface PaypalSetting {
  key: string;
}
export interface StripeSetting {
  key: string;
}
export interface CodSetting {
  message: LocaleTextDocLean;
  qrCode: string;
  paymentOnDelivery: boolean;
}

export interface PaySettingDoc extends PaySettingPoJo, mongoose.Document {}
export type PaySettingModel = mongoose.Model<PaySettingDoc>;
export type PaySettingDocLean = mongoose.LeanDocument<PaySettingDoc>;

const schema = new mongoose.Schema<PaySettingPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  name: {
    type: localeTextSchema,
    required: true,
  },
  payType: {
    type: String,
    enum: ["paypal", "stripe", "cod"],
    required: true,
  },
  shipTypes: {
    type: [String],
    default: [],
  },
  countryIds: {
    type: [mongoose.Types.ObjectId],
    default: [],
    ref: "Country",
  },
  setting: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default mongoose.model<PaySettingDoc, PaySettingModel>("PaySetting", schema);
