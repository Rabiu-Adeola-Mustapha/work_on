import mongoose from "mongoose";

import LocaleTextSchema, { LocaleTextDocLean } from "./locale.model";

export interface CountryPoJo {
  name: LocaleTextDocLean;
  code: string;
  iso: string;
  created_at: Date;
}

export interface CountryDoc extends CountryPoJo, mongoose.Document {}
export type CountryModel = mongoose.Model<CountryDoc>;
export type CountryDocLean = mongoose.LeanDocument<CountryDoc>;

export const schema = new mongoose.Schema<CountryPoJo>({
  code: {
    type: String,
    required: true,
  },
  iso: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: LocaleTextSchema,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

schema.index({ "name.en": 1 }, { unique: true });

export default mongoose.model<CountryDoc, CountryModel>("Country", schema);
