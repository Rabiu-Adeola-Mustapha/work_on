import mongoose from "mongoose";

import localeCore from "../core/locale.core";
import { AdminUserDocLean } from "./adminUser.model";
import LocaleTextSchema, { LocaleTextPoJo } from "./locale.model";
import { ShopDocLean } from "./shop.model";

export interface CategoryPoJo {
  shop_id: mongoose.Types.ObjectId | ShopDocLean;

  // a unique code for easy looking.  We can't use lookup for this because it has different value in differernt locale
  code: string;

  name: LocaleTextPoJo;
  parent_id?: mongoose.Types.ObjectId | CategoryDocLean;
  slug: LocaleTextPoJo;
  rewardPayout?: number;
  created_at: Date;
  created_by: mongoose.Types.ObjectId | AdminUserDocLean;
}

export interface CategoryDoc extends CategoryPoJo, mongoose.Document {}
export type CategoryModel = mongoose.Model<CategoryDoc>;
export type CategoryDocLean = mongoose.LeanDocument<CategoryDoc>;

const schema = new mongoose.Schema<CategoryPoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  name: {
    type: LocaleTextSchema,
  },
  // name_zh_Hant: { type: String },
  // name_zh_Hans: { type: String },
  parent_id: {
    type: mongoose.Types.ObjectId,
    ref: "Category",
  },
  slug: { type: LocaleTextSchema },
  // slug_zh_Hant: { type: String },
  // slug_zh_Hans: { type: String },

  rewardPayout: {
    type: Number,
  },

  created_at: {
    type: Date,
    default: Date.now,
  },
  created_by: {
    type: mongoose.Types.ObjectId,
    ref: "AdminUser",
  },
});

export function resCategory(category: CategoryDocLean, locale: string) {
  return {
    id: category._id,
    name: localeCore.getDefaultLocaleText(locale, category.name),
    slug: localeCore.getDefaultLocaleText(locale, category.slug),
    parentId: category.parent_id,
    rewardPayout: category.rewardPayout,
  };
}

schema.index({ shopId: 1, code: 1 }, { unique: true });
export default mongoose.model<CategoryDoc, CategoryModel>("Category", schema);
