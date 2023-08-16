import mongoose from "mongoose";

import LocaleTextSchema, { LocaleOption, LocaleTextPoJo } from "./locale.model";
import { MediaDocLean } from "./media.model";
import { ShopUserDocLean, ShopUserSchema } from "./shopUser.model";

export enum ShopType {
  regular = "regular",
  multiMerchant = "multiMerchant", // parent of multi merchant
  // merchant = "merchant", // child of multi merchant
}

export enum CurrencyOption {
  HKD = "HKD",
  CNY = "CNY",
  USD = "USD",
}

export enum RewardRoundOff {
  roundUp = "roundUp",
  roundDown = "roundDown",
  toFixed = "toFixed",
}

export interface ShopRequestType {
  _id: any;
  google_key_client_id: string;
  google_key_secret: string;
  default_locale: string;
}

export interface PaymentKeysPOJO {
  prod_key: string;
  prod_secret: string;
  webhook_prod_secret: string;
  test_key: string;
  test_secret: string;
  webhook_test_secret: string;
}

export interface PaymentsPOJO {
  paypal: PaymentKeysPOJO;
  stripe: PaymentKeysPOJO;
}

const PaymentKeysSchema = new mongoose.Schema({
  prod_key: { type: String },
  prod_secret: { type: String },
  webhook_prod_secret: { type: String },
  test_key: { type: String },
  test_secret: { type: String },
  webhook_test_secret: { type: String },
});

export const PaymentsSchema = new mongoose.Schema<PaymentsPOJO>({
  paypal: { type: PaymentKeysSchema },
  stripe: { type: PaymentKeysSchema },
});

export interface ShopPoJo {
  shop_type: ShopType;
  name: LocaleTextPoJo;
  code: string;
  // the sequence matters.  First one is default, and the order will be showed in language selector accordingly.
  locales: string[];
  default_locale: LocaleOption;

  currencies: string[];
  default_currency: CurrencyOption;

  users: ShopUserDocLean[];
  created_at: Date;
  google_key_client_id: string;
  google_key_secret: string;

  payments: PaymentsPOJO;

  order_prefix: string;
  product_prefix: string;

  smtp_from: string;
  smtp_transport: any;

  ship_sf_enabled: boolean;
  ship_pickup_enabled: boolean;
  ship_basic_enabled: boolean;

  logo_media_id: mongoose.Types.ObjectId | MediaDocLean;
  root_url: string;

  // if it's not set (null), that means reward function is turned off
  rewardPayout?: number;
  // round off to whole number (up/down) or decimal when calculating reward points
  rewardRoundOff: RewardRoundOff;

  accessYouUser?: string;
  accessYouAcctNo?: string;
  accessYouPw?: string;
  otpMsg?: string;
  timeZone?: string;
}

export interface ShopDoc extends ShopPoJo, mongoose.Document {}
export type ShopModel = mongoose.Model<ShopDoc>;
export type ShopDocLean = mongoose.LeanDocument<ShopDoc>;

const schema = new mongoose.Schema<ShopPoJo>({
  shop_type: {
    type: String,
    enum: Object.values(ShopType),
    default: ShopType.regular,
  },
  name: { type: LocaleTextSchema },
  code: { type: String, required: true },
  locales: {
    type: [String],
    required: true,
  },
  default_locale: {
    type: String,
    enum: Object.values(LocaleOption),
  },
  currencies: {
    type: [String],
  },
  default_currency: {
    type: String,
    enum: Object.values(CurrencyOption),
  },
  users: {
    type: [ShopUserSchema],
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  google_key_client_id: {
    type: String,
  },
  google_key_secret: {
    type: String,
  },

  payments: {
    type: PaymentsSchema,
  },

  order_prefix: {
    type: String,
    required: true,
    default: "ON",
  },

  product_prefix: {
    type: String,
    required: true,
    default: "PN",
  },

  smtp_from: {
    type: String,
  },
  smtp_transport: {
    type: mongoose.Schema.Types.Mixed,
  },
  logo_media_id: {
    type: mongoose.Types.ObjectId,
    ref: "Media",
  },
  root_url: {
    type: String,
  },
  ship_sf_enabled: {
    type: Boolean,
  },
  ship_pickup_enabled: {
    type: Boolean,
  },
  ship_basic_enabled: {
    type: Boolean,
  },
  rewardPayout: {
    type: Number,
  },
  rewardRoundOff: {
    type: String,
    enum: Object.values(RewardRoundOff),
    default: RewardRoundOff.toFixed,
  },
  accessYouUser: {
    type: String,
  },
  accessYouAcctNo: {
    type: String,
  },
  accessYouPw: {
    type: String,
  },
  otpMsg: {
    type: String,
  },
  timeZone: {
    type: String,
  },
});

export default mongoose.model<ShopDoc, ShopModel>("Shop", schema);
