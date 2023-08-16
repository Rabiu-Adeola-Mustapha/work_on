import mongoose from "mongoose";

export const AvailableLocales = ["en", "zhHant", "zhHans"];

export type LocaleOptionType = "en" | "zh-Hant" | "zh-Hans";
export enum LocaleOption {
  en = "en",
  zhHant = "zh-Hant",
  zhHans = "zh-Hans",
}

export interface LocaleTextPoJo {
  en: string;
  zhHant: string;
  zhHans: string;
}

export interface LocaleTextDoc extends LocaleTextPoJo, mongoose.Document {}
export type LocaleTextDocLean = mongoose.LeanDocument<LocaleTextDoc>;

const localeTextSchema = new mongoose.Schema<LocaleTextPoJo>({
  en: { type: String },
  zhHant: { type: String },
  zhHans: { type: String },
});

export default localeTextSchema;
