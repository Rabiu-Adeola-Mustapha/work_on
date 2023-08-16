import mongoose from "mongoose";

import { AdminUserDocLean } from "./adminUser.model";

export enum ShopUserType {
  admin = "admin",
  shopManager = "shopManager",
}

export interface ShopUserPoJo {
  admin_user_id: mongoose.Types.ObjectId | AdminUserDocLean;
  type: ShopUserType;
  created_at: Date;
}

export interface ShopUserDoc extends ShopUserPoJo, mongoose.Document {}
export type ShopUserDocLean = mongoose.LeanDocument<ShopUserDoc>;

export const ShopUserSchema = new mongoose.Schema<ShopUserPoJo>({
  admin_user_id: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "AdminUser",
  },
  type: {
    type: String,
    enum: Object.values(ShopUserType),
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});
