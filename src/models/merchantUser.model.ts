import mongoose from "mongoose";

import { AdminUserDocLean } from "./adminUser.model";

export enum MerchantUserType {
  admin = "merchantAdmin",
  shopManager = "merchantShopManager",
}

export interface MerchantUserPoJo {
  admin_user_id: mongoose.Types.ObjectId | AdminUserDocLean;
  type: MerchantUserType;
  created_at: Date;
}

export interface MerchantUserDoc extends MerchantUserPoJo, mongoose.Document {}
export type MerchantUserDocLean = mongoose.LeanDocument<MerchantUserDoc>;

export const MerchantUserSchema = new mongoose.Schema<MerchantUserPoJo>({
  admin_user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "AdminUser",
  },
  type: {
    type: String,
    enum: Object.values(MerchantUserType),
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});
