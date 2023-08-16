import mongoose from "mongoose";

import { FeeSettingFlat, FeeSettingFree } from "../types/shippingSetting";
import { CountryDocLean } from "./country.model";
import { HkRegionDocLean } from "./hkRegion.model";
import localeTextSchema, { LocaleTextPoJo } from "./locale.model";
import { ShopDocLean } from "./shop.model";

export interface ShipSettingPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  countryIds: mongoose.Types.ObjectId[] | CountryDocLean[];
  options: ShipSettingOptionDocLean[];
  createdAt: Date;
}

export type ShipType = "basic" | "sf" | "pickup"; // determines shipping mode and shipping price
export type AddressType = "regular" | "sfLocation" | "pickupLocation"; // determines  address information
export const ShipTypeArr = ["basic", "sf", "pickup"];

interface ShipSettingOptionPoJo {
  shipType: ShipType;
  name: string;
  feeOptions: FeeOptionDocLean[];
  hkSubDistrictCharges: HkSubDistrictChargeDocLean[];
}

interface FeeOptionPoJo {
  name: LocaleTextPoJo;
  feeType: "flat" | "free";
  setting: FeeSettingFlat | FeeSettingFree;
  excludeHkSubDistrictCharge?: boolean;
}

interface HkSubDistrictChargePoJo {
  hkRegionId: mongoose.Types.ObjectId | HkRegionDocLean;
  charge: number;
}

export interface ShipSettingDoc extends ShipSettingPoJo, mongoose.Document {}
export type ShipSettingModel = mongoose.Model<ShipSettingDoc>;
export type ShipSettingDocLean = mongoose.LeanDocument<ShipSettingDoc>;

export interface ShipSettingOptionDoc extends ShipSettingOptionPoJo, mongoose.Document {}
export type ShipSettingOptionDocLean = mongoose.LeanDocument<ShipSettingOptionDoc>;

export interface FeeOptionDoc extends FeeOptionPoJo, mongoose.Document {}
export type FeeOptionDocLean = mongoose.LeanDocument<FeeOptionDoc>;

export interface HkSubDistrictChargeDoc extends HkSubDistrictChargePoJo, mongoose.Document {}
export type HkSubDistrictChargeDocLean = mongoose.LeanDocument<HkSubDistrictChargeDoc>;

const HkSubDistrictChargeSchema = new mongoose.Schema<HkSubDistrictChargePoJo>({
  hkRegionId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "HKRegion",
  },
  charge: { type: Number, required: true },
});

const FeeOptionSchema = new mongoose.Schema<FeeOptionPoJo>({
  name: {
    type: localeTextSchema,
    required: true,
  },
  feeType: {
    type: String,
    enum: ["flat", "free"],
    required: true,
  },
  setting: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  excludeHkSubDistrictCharge: {
    type: Boolean,
  },
});

const ShipSettingOptionSchema = new mongoose.Schema<ShipSettingOptionPoJo>({
  name: {
    type: String,
    required: true,
  },
  shipType: {
    type: String,
    enum: ["basic", "sf", "pickup"],
    required: true,
  },
  feeOptions: {
    type: [FeeOptionSchema],
    required: true,
  },
  hkSubDistrictCharges: {
    type: [HkSubDistrictChargeSchema],
    default: [],
  },
});

const ShipSettingSchema = new mongoose.Schema<ShipSettingPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  countryIds: {
    type: [mongoose.Types.ObjectId],
    required: true,
    ref: "Country",
  },
  options: {
    type: [ShipSettingOptionSchema],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default mongoose.model<ShipSettingDoc, ShipSettingModel>("ShipSetting", ShipSettingSchema);
