import mongoose from "mongoose";

import { ShipAddrDocLean, ShipAddrSchema } from "./shipAddr.model";
import { ShopDocLean } from "./shop.model";

export enum AuthProvider {
  local = "local",
  google = "google",
  facebook = "facebook",
}

export interface UserRequestType {
  _id: any;
}

export interface UserPoJo {
  shop_id: mongoose.Types.ObjectId | ShopDocLean;
  first_name: string;
  last_name: string;
  mobile_number: string;
  mobile_number_verified: boolean;
  mobile_number_verified_at: Date;
  updating_mobile_number: string;
  sms_otp: string;
  sms_otp_created_at: Date;
  updating_sms_otp?: string;
  updating_sms_otp_created_at?: Date;
  password_hash: string;
  email: string;
  email_verified: boolean;
  email_verification_code: string;
  password: string;
  internal_password: string;
  picture_url: string;
  provider: AuthProvider;
  provider_id: string;
  ship_addrs: ShipAddrDocLean[];

  created_at: Date;

  resetPwCode: string;
  resetPwCodeDate: Date;
}

export interface UserDoc extends UserPoJo, mongoose.Document {}
export type UserModel = mongoose.Model<UserDoc>;
export type UserDocLean = mongoose.LeanDocument<UserDoc>;

const schema = new mongoose.Schema<UserPoJo>({
  shop_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  first_name: {
    type: String,
  },
  last_name: {
    type: String,
  },
  mobile_number: {
    type: String,
  },
  mobile_number_verified: {
    type: Boolean,
  },
  mobile_number_verified_at: {
    type: Date,
  },
  updating_mobile_number: {
    type: String,
  },
  sms_otp: {
    type: String,
  },
  sms_otp_created_at: {
    type: Date,
  },
  updating_sms_otp: {
    type: String,
  },
  updating_sms_otp_created_at: {
    type: Date,
  },
  password_hash: {
    type: String,
  },
  email: {
    type: String,
  },
  email_verified: {
    type: Boolean,
    required: true,
  },
  email_verification_code: {
    type: String,
  },
  password: {
    type: String,
  },
  internal_password: {
    type: String,
  },
  provider: {
    type: String,
    enum: Object.values(AuthProvider),
    required: true,
  },
  provider_id: {
    type: String,
    required: true,
  },
  picture_url: {
    type: String,
  },
  ship_addrs: {
    type: [ShipAddrSchema],
    default: [],
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true,
  },
  resetPwCode: {
    type: String,
  },
  resetPwCodeDate: {
    type: Date,
  },
});

schema.index({ shop_id: 1, provider: 1, provider_id: 1 }, { unique: true });

// can't add duplicate key because email / mobile_number can be null with google or facebook
// schema.index({ shop_id: 1, provider: 1, email: 1 }, { unique: true });
// schema.index({ shop_id: 1, provider: 1, mobile_number: 1 }, { unique: true });

export default mongoose.model<UserDoc, UserModel>("User", schema);
