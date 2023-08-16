import mongoose from "mongoose";

import { ShopDocLean } from "./shop.model";

export type MailTemplateType =
  | "orderCreatedAdmin"
  | "orderCreatedUser"
  | "orderCancelledAdmin"
  | "orderCancelledUser"
  | "paymentSubmitted"
  | "paymentReceivedAdmin"
  | "paymentReceivedUser"
  | "orderShipped"
  | "orderDelivered"
  | "awaitingPayment"
  | "paymentRefunded";

export const MailTemplateTypeArr = [
  "orderCreatedAdmin",
  "orderCreatedUser",
  "orderCancelledAdmin",
  "orderCancelledUser",
  "paymentSubmitted",
  "paymentReceivedAdmin",
  "paymentReceivedUser",
  "orderShipped",
  "orderDelivered",
  "awaitingPayment",
  "paymentRefunded",
];

export interface MailTemplatePoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;

  templateType: MailTemplateType;
  subject: string; // if it's empty, use default
  body: string;

  ccList: string[];
  bccList: string[];

  createdAt: Date;
}

export interface MailTemplateDoc extends MailTemplatePoJo, mongoose.Document {}
export interface MailTemplateModel extends mongoose.Model<MailTemplateDoc> {}
export type MailTemplateDocLean = mongoose.LeanDocument<MailTemplateDoc>;

export const schema = new mongoose.Schema<MailTemplatePoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  templateType: {
    type: String,
    enum: MailTemplateTypeArr,
    required: true,
  },
  subject: {
    type: String,
  },
  body: {
    type: String,
    required: true,
  },
  ccList: {
    type: [String],
  },
  bccList: {
    type: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

schema.index({ shopId: 1, templateType: 1 }, { unique: true });

export default mongoose.model<MailTemplateDoc, MailTemplateModel>("MailTemplate", schema);
