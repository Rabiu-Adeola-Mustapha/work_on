import mongoose from "mongoose";

import { AdminUserDocLean } from "./adminUser.model";
import { ShopDocLean } from "./shop.model";
import { UserDocLean } from "./user.model";

export type MailType =
  | "emailVerification"
  | "adminUserRegistration"
  | "formSubmitNotify"
  | "orderCreatedNotify"
  | "orderMismatchNotify"
  | "paymentReceivedNotify"
  | "orderShippedNotify"
  | "orderArrivedNotify"
  | "orderCancelledNotify"
  | "paymentRefundedNotify"
  | "resetPwd"
  | "frontResetPwd";

export interface MailPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  userId?: mongoose.Types.ObjectId | UserDocLean;
  adminUserId?: mongoose.Types.ObjectId | AdminUserDocLean;
  message: any;
  mailType: MailType;
  sentInfo: any;
  createdAt: Date;
}

export interface MailDoc extends MailPoJo, mongoose.Document {}
export type MailModel = mongoose.Model<MailDoc>;
export type MailDocLean = mongoose.LeanDocument<MailDoc>;

const schema = new mongoose.Schema<MailPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  adminUserId: {
    type: mongoose.Types.ObjectId,
    ref: "AdminUser",
  },
  message: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  mailType: {
    type: String,
    enum: [
      "emailVerification",
      "adminUserRegistration",
      "formSubmitNotify",
      "orderCreatedNotify",
      "orderMismatchNotify",
      "paymentReceivedNotify",
      "orderShippedNotify",
      "orderArrivedNotify",
      "orderCancelledNotify",
      "paymentRefundedNotify",
      "resetPwd",
      "frontResetPwd",
    ],
    required: true,
  },
  sentInfo: {
    type: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default mongoose.model<MailDoc, MailModel>("Mail", schema);
