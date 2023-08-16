import mongoose from "mongoose";

import localeTextSchema, { LocaleTextPoJo } from "./locale.model";

export interface SfLocationPoJo {
  code: string;
  sub_district: string;
  address: LocaleTextPoJo;
  service_partner: string;
  shipping_method: "business_station" | "locker" | "service_partner" | "store";
  is_hot: string;
  hours_monfri: string;
  hours_satsun: string;
  region?: string;
  service_partner_type: string;
  created_at: Date;
}

export interface SfLocationDoc extends SfLocationPoJo, mongoose.Document {}

export type SfLocationModel = mongoose.Model<SfLocationDoc>;

export type SfLocationDocLean = mongoose.LeanDocument<SfLocationDoc>;

const schema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
  },
  sub_district: String,
  address: {
    type: localeTextSchema,
  },
  service_partner: String,
  shipping_method: String,
  is_hot: String,
  hours_monfri: String,
  hours_satsun: String,
  region: String,
  service_partner_type: String,
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default mongoose.model<SfLocationDoc, SfLocationModel>("SfLocation", schema);
