import mongoose from "mongoose";

import LocaleTextSchema, { LocaleTextDocLean } from "./locale.model";

interface HkRegionPoJo {
  region: LocaleTextDocLean;
  district: LocaleTextDocLean;
  sub_district: LocaleTextDocLean;
  created_at: Date;
}

export interface HkRegionDoc extends HkRegionPoJo, mongoose.Document {}
export type HkRegionModel = mongoose.Model<HkRegionDoc>;
export type HkRegionDocLean = mongoose.LeanDocument<HkRegionDoc>;

export const schema = new mongoose.Schema<HkRegionPoJo>({
  region: {
    type: LocaleTextSchema,
    required: true,
  },
  district: {
    type: LocaleTextSchema,
    required: true,
  },
  sub_district: {
    type: LocaleTextSchema,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<HkRegionDoc, HkRegionModel>("HKRegion", schema);
