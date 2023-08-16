import mongoose from "mongoose";

import localeTextSchema, { LocaleTextDocLean } from "./locale.model";
import { PayType } from "./paySetting.model";

export interface PaymentSessionPoJo {
  sessionId: string;
  paymentType: PayType;
  paymentName: LocaleTextDocLean;
  payOptionId: string;
  currency: string;
  isActiveSession?: Boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentSessionDoc extends PaymentSessionPoJo, mongoose.Document {}
export type PaymentSessionModel = mongoose.Model<PaymentSessionDoc>;
export type PaymentSessionDocLean = mongoose.LeanDocument<PaymentSessionDoc>;

export const PaymentSessionSchema = new mongoose.Schema<PaymentSessionPoJo>({
  sessionId: {
    type: String,
    required: true,
  },
  payOptionId: {
    type: String,
    required: true,
  },
  paymentType: {
    type: String,
    required: true,
  },
  paymentName: {
    type: localeTextSchema,
    required: true,
  },
  isActiveSession: {
    type: Boolean,
    default: true,
  },
  currency: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default PaymentSessionSchema;
