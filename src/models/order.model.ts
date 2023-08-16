import { formatInTimeZone } from "date-fns-tz";
import Debug from "debug";
import mongoose from "mongoose";

import counterCore from "../core/counter.core";
import orderCore from "../core/order.core";
import { CountryDocLean } from "./country.model";
import LogSchema, { LogPoJo } from "./log.model";
import { MediaDocLean, resMedia } from "./media.model";
import NoteSchema, { NoteDocLean, NotePoJo } from "./note.model";
import { OrderProductPoJo, OrderProductSchema } from "./orderProduct.model";
import { PaymentSessionPoJo, PaymentSessionSchema } from "./paymentSession.model";
import { PickupAddrPoJo } from "./pickUpAddr.model";
import { SfLocationPoJo } from "./sfLocation.model";
import { ShipAddrPoJo } from "./shipAddr.model";
import { AddressType, ShipType } from "./shipSetting.model";
import { ShopDocLean } from "./shop.model";
import { UserDocLean } from "./user.model";

// eslint-disable-next-line
const debug = Debug("project:order.model");

export type PaymentStatus = "awaiting" | "paid" | "refunded";
export const PaymentStatusArr = ["awaiting", "paid", "refunded"];

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export const OrderStatusArr = ["pending", "processing", "shipped", "delivered", "cancelled"];

export interface OrderPoJo {
  shopId: mongoose.Types.ObjectId | ShopDocLean;
  userId: mongoose.Types.ObjectId | UserDocLean;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  products: OrderProductPoJo[];
  currency: string;
  payments?: PaymentSessionPoJo[];
  paymentProofId?: mongoose.Types.ObjectId | MediaDocLean;
  countryId: mongoose.Types.ObjectId | CountryDocLean;
  shipType: ShipType; // determines shipping mode and shipping price
  addrType: AddressType; // determines  address information
  shipName: string;
  shipOptionId: string; // ShipSettingOptionId
  shipAddr?: Omit<ShipAddrPoJo, "created_at">;
  sfLocation?: Omit<SfLocationPoJo, "created_at" | "service_partner_type">;
  pickupAddr?: Omit<PickupAddrPoJo, "created_at" | "shop_id">;
  shipping: number;
  shippingExtra: number;
  shipTotal: number;
  itemsTotal: number;
  taxTotal: number;
  total: number;
  notes?: NotePoJo[];
  logs?: LogPoJo[];

  // TODO: replace with reward record Id.
  rewardPayout?: number;
  rewardRedeemed: number;
  createdAt?: Date;
}

export interface OrderDoc extends OrderPoJo, mongoose.Document {}
export type OrderModel = mongoose.Model<OrderDoc>;
export type OrderDocLean = mongoose.LeanDocument<OrderDoc>;

export const OrderSchema = new mongoose.Schema<OrderPoJo>({
  shopId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Shop",
  },
  userId: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "User",
  },
  orderNumber: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: OrderStatusArr,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: PaymentStatusArr,
    required: true,
  },
  products: {
    type: [OrderProductSchema],
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  payments: {
    type: [PaymentSessionSchema],
  },
  paymentProofId: {
    type: mongoose.Types.ObjectId,
    ref: "Media",
  },
  countryId: {
    type: mongoose.Types.ObjectId,
    ref: "Country",
    required: true,
  },
  shipType: {
    type: String,
    required: true,
  },
  addrType: {
    type: String,
    required: true,
  },
  shipName: {
    type: String,
    required: true,
  },
  shipOptionId: {
    type: String,
    required: true,
  },
  shipAddr: {
    type: mongoose.Schema.Types.Mixed,
  },
  sfLocation: {
    type: mongoose.Schema.Types.Mixed,
  },
  pickupAddr: {
    type: mongoose.Schema.Types.Mixed,
  },
  shipping: {
    type: Number,
    required: true,
  },
  shippingExtra: {
    type: Number,
  },
  shipTotal: {
    type: Number,
    required: true,
  },
  itemsTotal: {
    type: Number,
    required: true,
  },
  taxTotal: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  logs: {
    type: [LogSchema],
  },
  notes: {
    type: [NoteSchema],
  },
  rewardPayout: {
    type: Number,
  },
  rewardRedeemed: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    reuqired: true,
  },
});

OrderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });

export function resOrder(order: OrderDocLean, shop: ShopDocLean, locale: string) {
  const orderNumber = counterCore.getFormattedSequence(shop.order_prefix, order.orderNumber);
  const activePaymentSession = order.payments.find((payment) => payment.isActiveSession === true);
  const { addrType, shipAddr, sfLocation, pickupAddr } = order;

  return {
    id: order._id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    orderNumber,
    orderSequence: order.orderNumber, // the actual digits without formatting
    products: order.products.map((p) => orderCore.getOrderProductsRes(p, locale, order.currency, shop)),
    countryId: order.countryId,
    shipType: order.shipType,
    addrType: order.addrType,
    shipName: order.shipName,
    shipId: order.shipOptionId,
    shipping: order.shipping,
    shippingExtra: order.shippingExtra,
    shipTotal: order.shipTotal,
    itemsTotal: order.itemsTotal,
    taxTotal: order.taxTotal,
    total: order.total,
    currency: order.currency,
    payments: order.payments,
    activePaymentSession: { ...activePaymentSession, paymentStatus: order.paymentStatus },
    logs: order.logs,
    rewardPayout: order.rewardPayout,
    rewardRedeemed: order.rewardRedeemed,
    ...orderCore.getOrderShipRes({ addrType, shipAddr, sfLocation, pickupAddr }, locale),
    paymentProof: order.paymentProofId === undefined ? undefined : resMedia(order.paymentProofId as MediaDocLean),
    // TODO: Timezone should be set in shop level instead of hard coding
    orderAt: formatInTimeZone(order.createdAt, "Asia/Hong_Kong", "yyyy-MM-dd HH:mm:ss"),
    user: resUser(order.userId as UserDocLean),
    notes: order.notes === undefined ? undefined : order.notes.map(resNote),
    createdAt: order.createdAt,
  };
}

function resUser(user: UserDocLean) {
  return {
    email: user.email,
    mobile: user.mobile_number,
    id: user._id,
    firstName: user.first_name,
    lastName: user.last_name,
  };
}

function resNote(note: NoteDocLean) {
  return {
    id: note._id,
    body: note.body,
    createdAt: formatInTimeZone(note.createdAt, "Asia/Hong_Kong", "yyyy-MM-dd HH:mm:ss"),
    updatedAt: formatInTimeZone(note.updatedAt, "Asia/Hong_Kong", "yyyy-MM-dd HH:mm:ss"),
  };
}

export default mongoose.model<OrderDoc, OrderModel>("Order", OrderSchema);
