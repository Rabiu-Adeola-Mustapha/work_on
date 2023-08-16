import Debug from "debug";
import mongoose from "mongoose";

import counterCore from "../core/counter.core";
import localeCore from "../core/locale.core";
import ratingsCore from "../core/review.core";
import rewardCore from "../core/reward.core";
import { AdminUserDocLean } from "./adminUser.model";
import { CategoryDocLean, resCategory } from "./category.model";
import LocaleTextSchema, { LocaleTextPoJo } from "./locale.model";
import { MediaDocLean, resMedia } from "./media.model";
import { MerchantDocLean } from "./merchant.model";
import { ProductAttributeDocLean, ProductAttributeSchema } from "./productAttribute.model";
import { ShopDocLean } from "./shop.model";

// eslint-disable-next-line
const debug = Debug("project:product.model");

export enum ProductType {
  simple = "simple",
  variationParent = "variationParent",
  variationChild = "variationChild",
}

// Filter by attribute, how?
export interface ProductAttributePoJo {
  name: string;
}

export type Availability = "in" | "out";

// Shop: Attilio
// Differnt Users, have access to her-admin
// Shop: Officeman

// Store.model.ts
// 1 Shop -> Multiple Stores

// warehouse.model.ts
// 1 Shop -> Multiple Warehouses  <<<< this is where inventory is handled

export interface ProductPoJo {
  shop_id: mongoose.Types.ObjectId | ShopDocLean;
  merchant_id: mongoose.Types.ObjectId | MerchantDocLean;
  product_number: number;
  name: LocaleTextPoJo;
  price: number;
  description: LocaleTextPoJo;
  shortDescription: LocaleTextPoJo;
  featured_media_id: mongoose.Types.ObjectId | MediaDocLean;
  gallery_ids: mongoose.Types.ObjectId[] | MediaDocLean[];
  description_gallery_ids: mongoose.Types.ObjectId[] | MediaDocLean[];
  category_ids: mongoose.Types.ObjectId[] | CategoryDocLean[];
  product_type: ProductType;
  sku: string;
  is_promotion_product: boolean;
  // this should only be set for variationParent type
  // variation_children_ids: mongoose.Types.ObjectId[] | ProductDocLean[];

  // this should only be set for variationChild type
  parent_id: mongoose.Types.ObjectId | ProductDocLean;
  attributes: ProductAttributeDocLean[];

  rewardPayout?: number;

  relatedProductIds: mongoose.Types.ObjectId[] | ProductDocLean[];

  availability: Availability;

  // don't use Date to avoid timezone
  // this is just a refernce date to show customers when will the stock be available to ship
  stockReadyDate: String;

  created_at: Date;
  created_by: mongoose.Types.ObjectId | AdminUserDocLean;
  updatedAt: Date;
}

export interface ProductDoc extends ProductPoJo, mongoose.Document {}
export type ProductModel = mongoose.Model<ProductDoc>;
export type ProductDocLean = mongoose.LeanDocument<ProductDoc>;

export const ProductSchema = new mongoose.Schema<ProductPoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  merchant_id: {
    type: mongoose.Types.ObjectId,
    ref: "Merchant",
  },
  product_number: {
    type: Number,
    required: true,
  },
  name: {
    type: LocaleTextSchema,
  },
  price: {
    type: Number,
  },
  description: {
    type: LocaleTextSchema,
  },
  shortDescription: {
    type: LocaleTextSchema,
  },
  featured_media_id: {
    type: mongoose.Types.ObjectId,
    ref: "Media",
  },
  gallery_ids: {
    type: [mongoose.Types.ObjectId],
    ref: "Media",
    default: [],
  },
  description_gallery_ids: {
    type: [mongoose.Types.ObjectId],
    ref: "Media",
    default: [],
  },
  category_ids: {
    type: [mongoose.Types.ObjectId],
    ref: "Category",
    default: [],
  },
  product_type: {
    type: String,
    enum: Object.values(ProductType),
    default: ProductType.simple,
  },
  sku: {
    type: String,
    required: true,
  },
  is_promotion_product: {
    type: Boolean,
    default: false,
  },
  parent_id: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
  },
  attributes: {
    type: [ProductAttributeSchema],
  },
  rewardPayout: {
    type: Number,
  },
  relatedProductIds: {
    type: [mongoose.Types.ObjectId],
    ref: "Product",
  },
  availability: {
    type: String,
    enum: ["in", "out"],
    default: "in",
  },
  stockReadyDate: {
    type: String,
    default: "", // empty means no value.  using null makes it hard to update
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
  created_by: {
    type: mongoose.Types.ObjectId,
    ref: "AdminUser",
    required: true,
  },
  updatedAt: {
    type: Date,
  },
});

ProductSchema.index(
  {
    "name.en": "text",
    "name.zhHant": "text",
    "name.zhHans": "text",
    "description.en": "text",
    "description.zhHant": "text",
    "description.zhHans": "text",
    sku: "text",
  },
  {
    name: "product_search_idx",
  }
);

ProductSchema.index({ shop_id: 1, sku: 1 }, { unique: true });

ProductSchema.index({ shop_id: 1, product_number: 1 }, { unique: true });

export function resProduct(product: ProductDocLean, locale: string, currency: string, shop: ShopDocLean) {
  const productNumber = counterCore.getFormattedSequence(shop.product_prefix, product.product_number);

  return {
    id: product._id,
    name: localeCore.getDefaultLocaleText(locale, product.name),
    description: localeCore.getDefaultLocaleText(locale, product.description),
    shortDescription: localeCore.getDefaultLocaleText(locale, product.shortDescription),
    price: product.price,
    productNumber,
    galleries: (product.gallery_ids as MediaDocLean[]).map(resMedia),
    descriptionGalleries: (product.description_gallery_ids as MediaDocLean[]).map(resMedia),
    featureMedia:
      product.featured_media_id === undefined ? undefined : resMedia(product.featured_media_id as MediaDocLean),
    categories: (product.category_ids as CategoryDocLean[]).map((c) => resCategory(c, locale)),
    currency,
    sku: product.sku,
    rating: ratingsCore.calculateAvgRatings(product._id),
    relatedProductIds: product.relatedProductIds,
    rewardPayout: rewardCore.calculateProductReward(shop.rewardPayout, product),
    availability: product.availability,
    stockReadyDate: product.stockReadyDate,
  };
}

export default mongoose.model<ProductDoc, ProductModel>("Product", ProductSchema);
