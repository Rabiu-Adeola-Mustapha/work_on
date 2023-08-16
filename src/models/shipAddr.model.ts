import mongoose from "mongoose";

export interface ShipAddrPoJo {
  addr_type: "regular" | "sfLocation" | "pickUp";
  recipient_name: string;
  tel_country_code: string;
  tel: string;
  country_code: string; // HK
  address: string; // street, building, flat

  // for HK
  region?: string; // NT, HK, KL
  district?: string;
  subDistrict?: string;
  sub_district_id?: string; // this is needed to calculate extra shipping fee

  // for international
  state?: string;
  city?: string;
  zip_code?: string;
  is_default?: boolean;

  created_at?: Date;
}

export interface ShipAddrDoc extends ShipAddrPoJo, mongoose.Document {}
export type ShipAddrModel = mongoose.Model<ShipAddrDoc>;
export type ShipAddrDocLean = mongoose.LeanDocument<ShipAddrDoc>;

export const ShipAddrSchema = new mongoose.Schema<ShipAddrPoJo>({
  addr_type: {
    type: String,
    required: true,
  },
  recipient_name: {
    type: String,
    required: true,
  },
  tel_country_code: {
    type: String,
    required: true,
  },
  tel: {
    type: String,
    required: true,
  },
  country_code: {
    type: String,
    required: true,
    maxlength: 3,
    minlength: 2,
  },
  address: {
    type: String,
  },
  region: {
    type: String,
  },
  district: {
    type: String,
  },
  subDistrict: {
    type: String,
  },
  sub_district_id: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  zip_code: {
    type: String,
  },
  is_default: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});
