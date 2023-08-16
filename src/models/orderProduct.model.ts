import Debug from "debug";
import mongoose from "mongoose";

import LocaleTextSchema, { LocaleTextPoJo } from "./locale.model";
import { ProductAttributeDocLean, ProductAttributeSchema } from "./productAttribute.model";

// eslint-disable-next-line
const debug = Debug("project:product.model");

export enum OrderProductType {
  simple = "simple",
  variationParent = "variationParent",
  variationChild = "variationChild",
}

// Filter by attribute, how?
export interface OrderProductAttributePoJo {
  name: string;
}

export interface OrderMediaPoJo {
  filename: string;
  width: number;
  height: number;
  url: string;
  size: string;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

const OrderMediaSchema = new mongoose.Schema<OrderMediaPoJo>({
  filename: { type: String, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  size: { type: String, required: true },
  thumbnailWidth: { type: Number, required: true },
  thumbnailHeight: { type: Number, required: true },
});

export interface OrderProductPoJo {
  _id: string;
  merchantId: string;
  productNumber: string;
  name: LocaleTextPoJo;
  price: number;
  quantity: number;
  discountPrice: number;
  discountLinkId: String;
  description: LocaleTextPoJo;
  shortDescription: LocaleTextPoJo;
  featuredMedia: OrderMediaPoJo;
  galleries: OrderMediaPoJo[];
  descriptionGalleries: OrderMediaPoJo[];
  categoryIds: mongoose.Types.ObjectId[];
  //   productType: OrderProductType;
  sku: string;
  isPromotionProduct: boolean;

  // tracks if sold product has been reviewed by buyer
  reviewMailSent?: boolean;
  rating?: number;
  // this should only be set for variationParent type
  // variation_childrenIds: mongoose.Types.ObjectId[] | OrderProductDocLean[];

  // this should only be set for variationChild type
  parentId: string;
  attributes: ProductAttributeDocLean[];
  rewardPayout?: number;
  relatedProductIds: mongoose.Types.ObjectId[];
}

export interface OrderProductDoc extends OrderProductPoJo {}
export type OrderProductModel = mongoose.Model<OrderProductDoc>;
export type OrderProductDocLean = mongoose.LeanDocument<OrderProductDoc>;

export const OrderProductSchema = new mongoose.Schema<OrderProductPoJo>({
  _id: {
    type: String,
  },
  merchantId: {
    type: String,
  },
  productNumber: {
    type: String,
    required: true,
  },
  name: {
    type: LocaleTextSchema,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  discountPrice: {
    type: Number,
  },
  discountLinkId: {
    type: String,
  },
  description: {
    type: LocaleTextSchema,
  },
  shortDescription: {
    type: LocaleTextSchema,
  },
  featuredMedia: {
    type: OrderMediaSchema,
  },
  galleries: {
    type: [OrderMediaSchema],
    default: [],
  },
  descriptionGalleries: {
    type: [OrderMediaSchema],
    default: [],
  },
  categoryIds: {
    type: [mongoose.Types.ObjectId],
    default: [],
  },
  sku: {
    type: String,
    required: true,
  },
  isPromotionProduct: {
    type: Boolean,
    default: false,
  },
  rating: {
    type: Number,
  },
  reviewMailSent: {
    type: Boolean,
    default: false,
  },
  parentId: {
    type: String,
  },
  attributes: {
    type: [ProductAttributeSchema],
  },
  rewardPayout: {
    type: Number,
  },
  relatedProductIds: {
    type: [mongoose.Types.ObjectId],
  },
});
