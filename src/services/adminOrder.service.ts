import { addDays, addMilliseconds } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";

import counterCore from "../core/counter.core";
import localeCore from "../core/locale.core";
import mailCore from "../core/mail.core";
import rewardCore from "../core/reward.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import HkRegionModel from "../models/hkRegion.model";
import { LocaleOptionType } from "../models/locale.model";
import MailModel, { MailType } from "../models/mail.model";
import OrderModel, {
  OrderDoc,
  OrderDocLean,
  OrderStatus,
  OrderStatusArr,
  PaymentStatus,
  PaymentStatusArr,
  resOrder,
} from "../models/order.model";
import PickUpAddrModel from "../models/pickUpAddr.model";
import SfLocationModel from "../models/sfLocation.model";
import { ShipAddrPoJo } from "../models/shipAddr.model";
import { ShipTypeArr } from "../models/shipSetting.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import UserModel from "../models/user.model";

// eslint-disable-next-line
const debug = Debug("project:adminOrder.service");

interface OrderFilter {
  locale: LocaleOptionType;
  paging: {
    size: number;
    page: number;
  };
  orderStatuses: OrderStatus[];
  paymentStatuses: PaymentStatus[];
  userIds: mongoose.Types.ObjectId[];
  search: string;
  date: {
    from: string;
    to: string;
  };
}

const list = [
  shopIdMw,
  localeMw,
  body("paging.size").default(50).isNumeric().withMessage("Invalid size"),
  body("paging.page").default(1).isNumeric().withMessage("Invalid page"),
  body("userIds").isArray().optional().withMessage("userIds is not array"),
  body("userIds.*").isMongoId().withMessage("userIds items are not ObjectId"),
  body("orderStatuses").isArray().optional().withMessage("orderStatuses is not array"),
  body("orderStatuses.*").isIn(OrderStatusArr).withMessage("Invalid orderStatuses.*"),
  body("paymentStatuses").isArray().optional().withMessage("paymentStatuses is not array"),
  body("paymentStatuses.*").isIn(PaymentStatusArr).withMessage("Invalid paymentStatuses.*"),
  body("date").isObject().optional().withMessage("Inavlid date.  It must be an object"),
  body("date.from").isISO8601().optional().withMessage("Invalid date.from"),
  body("date.to").isISO8601().optional().withMessage("Invalid date.to"),
  body("search").isString().optional().withMessage("Invalid search"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const filter = req.data;
      filter.locale = req.locale;

      const shop = await ShopModel.findById(req.shop._id).lean();
      hydrateProductFilter(filter);

      const query = await getOrderListQuery(req.shop._id, filter, shop);

      const [orders, size] = await Promise.all([
        OrderModel.find(query)
          .populate(["userId"])
          .sort({ createdAt: -1 })
          .skip((filter.paging.page - 1) * filter.paging.size)
          .limit(filter.paging.size)
          .lean(),

        await OrderModel.countDocuments(query),
      ]);

      res.json({ size, list: orders.map((order) => resOrder(order, shop, req.locale)) });
    } catch (e) {
      next(e);
    }
  },
];

async function getOrderListQuery(
  shopId: mongoose.Types.ObjectId,
  filter: OrderFilter,
  shop: ShopDocLean
): Promise<mongoose.FilterQuery<OrderDoc>> {
  const queries: Array<mongoose.FilterQuery<OrderDoc>> = [];
  queries.push({ shop_id: shopId });

  if (filter.orderStatuses !== undefined) {
    queries.push({
      status: { $in: filter.orderStatuses },
    });
  }

  if (filter.paymentStatuses !== undefined) {
    debug(filter.paymentStatuses);
    queries.push({
      paymentStatus: { $in: filter.paymentStatuses },
    });
  }

  if (filter.userIds !== undefined && filter.userIds.length !== 0) {
    queries.push({
      userId: { $in: filter.userIds },
    });
  }

  if (filter.date) {
    queries.push({
      createdAt: {
        // start of day
        $gte: zonedTimeToUtc(filter.date.from, shop.timeZone ?? "Asia/Hong_Kong"),

        // end of day
        $lte: addMilliseconds(addDays(zonedTimeToUtc(filter.date.to, shop.timeZone ?? "Asia/Hong_Kong"), 1), -1),
      },
    });
  }

  return {
    $and: queries,
  };
}

function hydrateProductFilter(data: OrderFilter) {
  data.paging.size = parseInt(data.paging.size as any);
  data.paging.page = parseInt(data.paging.page as any);
}

const get = [
  shopIdMw,
  localeMw,
  query("orderId").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [order, shop] = await Promise.all([
        OrderModel.findOne({
          _id: req.data.orderId,
        })
          .lean()
          .populate(["logs", "notes", "paymentProofId", "userId"]),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      res.json({ ...resOrder(order, shop, req.locale) });
    } catch (e) {
      next(e);
    }
  },
];

const updateShipAddr = [
  shopIdMw,
  query("orderId").exists().isMongoId().withMessage("Missing id"),
  body("shipType").isIn(ShipTypeArr).withMessage("invalid shipType"),
  body("sfCode")
    .if((value: any, { req }: any) => req.body.shipType === "sf")
    .isString()
    .withMessage("invalid sfCode"),
  body("addr")
    .if((value: any, { req }: any) => req.body.shipType === "basic")
    .isObject()
    .withMessage("invalid addr"),
  body("pickupAddrId")
    .if((value: any, { req }: any) => req.body.shipType === "pickup")
    .isMongoId()
    .withMessage("invalid pickupAddrId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      let updatedOrder: mongoose.ModifyResult<OrderDoc>;

      if (req.body.shipType === "sf") {
        updatedOrder = await OrderModel.findOneAndUpdate(
          {
            _id: req.data.orderId,
          },
          {
            $set: {
              shipType: "sf",
              sfLocation: await SfLocationModel.findOne({ code: req.body.sfCode }).lean(),
              addrType: "sfLocation",
            },
            $unset: {
              shipAddr: 1,
              pickupAddr: 1,
            },
            $push: {
              logs: {
                changeType: "address",
                prevValue: "",
                newValue: req.body.sfCode,
              },
            },
          },
          { new: true, rawResult: true }
        );
      } else if (req.body.shipType === "basic") {
        updatedOrder = await OrderModel.findOneAndUpdate(
          {
            _id: req.data.orderId,
          },
          {
            $set: {
              shipType: "basic",
              shipAddr: await sanitizeShipAddr(req.body.addr, req.locale),
              addrType: "regular",
            },
            $unset: {
              sfLocation: 1,
              pickupAddr: 1,
            },
            $push: {
              logs: {
                changeType: "address",
                prevValue: "",
                newValue: JSON.stringify(req.body.addr),
              },
            },
          },
          { new: true, rawResult: true }
        );
      } else if (req.body.shipType === "pickup") {
        const pickUpAddr = await PickUpAddrModel.findById(req.body.pickupAddrId).lean();

        updatedOrder = await OrderModel.findOneAndUpdate(
          {
            _id: req.data.orderId,
          },
          {
            $set: {
              shipType: "pickup",
              pickupAddr: pickUpAddr,
              addrType: "pickupLocation",
            },
            $unset: {
              sfLocation: 1,
              shipAddr: 1,
            },
            $push: {
              logs: {
                changeType: "address",
                prevValue: "",
                newValue: JSON.stringify(pickUpAddr),
              },
            },
          },
          { new: true, rawResult: true }
        );
      }

      res.json(updatedOrder.value);
    } catch (e) {
      next(e);
    }
  },
];

async function sanitizeShipAddr(shipAddr: any, locale: string): Promise<ShipAddrPoJo> {
  debug("sanitizeShipAddr", shipAddr);
  if (shipAddr.countryCode === "852") {
    const district = await HkRegionModel.findById(shipAddr.subDistrictId).lean();

    return {
      addr_type: "regular",
      recipient_name: shipAddr.recipientName,
      tel_country_code: shipAddr.telCountryCode,
      tel: shipAddr.tel,
      country_code: shipAddr.countryCode,
      address: shipAddr.address,
      district: localeCore.getDefaultLocaleText(locale, district.district),
      subDistrict: localeCore.getDefaultLocaleText(locale, district.sub_district),
      region: localeCore.getDefaultLocaleText(locale, district.region),
      sub_district_id: district._id,
    };
  } else {
    return {
      addr_type: "regular",
      recipient_name: shipAddr.recipientName,
      tel_country_code: shipAddr.telCountryCode,
      tel: shipAddr.tel,
      country_code: shipAddr.countryCode,
      address: shipAddr.address,
      state: shipAddr.state,
      city: shipAddr.city,
      zip_code: shipAddr.zipCode,
    };
  }
}

const update = [
  shopIdMw,
  query("orderId").exists().isMongoId().withMessage("Missing id"),
  body("orderSequence").isNumeric().optional().withMessage("invalid order sequence"),
  body("paymentStatus").isIn(PaymentStatusArr).optional().withMessage("invalid payment status"),
  body("orderStatus").isIn(OrderStatusArr).optional().withMessage("invalid order status"),
  body("noteTitle").notEmpty().optional().isString().withMessage("invalid note title"),
  body("noteBody").optional().isString().withMessage("invalid noteBody"),
  body("sendEmail").isBoolean().optional().default(true).withMessage("invalid sendEmail"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [order, shop] = await Promise.all([
        OrderModel.findOne({
          _id: req.data.orderId,
        })
          .lean()
          .populate(["logs", "notes"]),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      const logs = getLogArr(req, order);

      const setter: mongoose.AnyKeys<OrderDoc> & mongoose.AnyObject = {};

      if (req.data.orderSequence) {
        setter.orderNumber = await counterCore.getUpdatedSequence(req.data.orderSequence, order.orderNumber, shop._id);
      }

      if (req.data.paymentStatus) {
        setter.paymentStatus = req.data.paymentStatus;
      }

      if (req.data.orderStatus) {
        setter.status = req.data.orderStatus;
      }

      // debug("setter", setter);

      const updatedOrder = await OrderModel.findOneAndUpdate(
        { _id: req.data.orderId },
        {
          $set: setter,
          $push: { logs: { $each: logs } },
        },
        { new: true, rawResult: true, arrayFilters: [{ "elem.isActiveSession": { $eq: true } }] }
      ).lean();

      if (updatedOrder.lastErrorObject.updatedExisting) {
        await updateOrderRewards(req.data.paymentStatus, updatedOrder.value);
      }

      // if (req.data.sendEmail && updatedOrder.lastErrorObject.updatedExisting) {
      if (updatedOrder.lastErrorObject.updatedExisting) {
        await sendAndLogEmail(shop._id, order, req.data.orderStatus, req.data.paymentStatus);
      }

      res.json(updatedOrder.value);
    } catch (e) {
      next(e);
    }
  },
];

const createNote = [
  shopIdMw,
  // body("title").notEmpty().isString().withMessage("Invalid title"),
  body("body").notEmpty().isString().withMessage("invalid body"),
  body("orderId").notEmpty().isString().withMessage("invalid order id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const order = await OrderModel.findByIdAndUpdate(
        { _id: req.data.orderId },
        {
          $push: {
            notes: {
              // title: req.data.title,
              body: req.data.body,
            },
          },
        },
        { new: true }
      );

      res.json(order);
    } catch (e) {
      next(e);
    }
  },
];

const updateNote = [
  shopIdMw,
  body("body").notEmpty().isString().withMessage("Invalid body"),
  body("orderId").notEmpty().isString().withMessage("invalid order id"),
  query("noteId").notEmpty().exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const order = await OrderModel.findOneAndUpdate(
        { _id: req.data.orderId, "notes._id": req.data.noteId },
        {
          $set: {
            "notes.$": {
              body: req.data.body,
              updatedAt: new Date(),
            },
          },
        },
        { new: true }
      );

      res.json(order);
    } catch (e) {
      next(e);
    }
  },
];

const resendEmail = [
  shopIdMw,
  body("orderId").notEmpty().isString().withMessage("invalid order id"),
  query("emailId").notEmpty().exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mail = await MailModel.findOne({ _id: req.data.emailId }).lean();
      const shop = await ShopModel.findById(req.shop._id).lean();
      const { mailType, message } = mail;

      // resend and log email
      await mailCore.sendMail({
        mailType,
        shopId: shop._id,
        logOrderId: req.data.orderId,
        mailOptions: message,
      });

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

interface LogObj {
  changeType: string;
  prevValue: string;
  newValue: string;
  note?: { title: string; body: string };
}

const getLogArr = (req: express.Request, order: OrderDocLean): LogObj[] => {
  const { orderStatus, paymentStatus, noteTitle, noteBody } = req.data;
  const activePayment = order.payments.find((payment) => payment.isActiveSession === true);
  const logs: LogObj[] = [];
  const noteObj = noteBody && noteTitle ? { note: { title: noteTitle, body: noteBody } } : {};

  if (orderStatus !== order.status) {
    const orderUpdateLog = {
      changeType: "orderStatus",
      prevValue: order.status,
      newValue: orderStatus,
      ...noteObj,
    };

    logs.push(orderUpdateLog);
  }

  if (activePayment && paymentStatus !== order.paymentStatus) {
    const paymentUpdateLog = {
      changeType: "paymentStatus",
      prevValue: order.paymentStatus,
      newValue: paymentStatus,
      ...noteObj,
    };

    logs.push(paymentUpdateLog);
  }

  return logs;
};

async function sendAndLogEmail(
  shopId: mongoose.Types.ObjectId,
  order: OrderDocLean,
  newOrderStatus: string,
  newPaymentStatus: string
) {
  const user = await UserModel.findOne({ shop_id: shopId, _id: order.userId }).lean();
  const emailStatus = ["paid", "shipped", "delivered", "cancelled", "refunded"].find(
    (s) => s === newOrderStatus || s === newPaymentStatus
  );

  if (emailStatus) {
    const [templateType, mailType]: [string, MailType] = getTemplateTypeAndMailType(emailStatus);

    await mailCore.sendMailWithTemplate({
      templateType,
      mailType,
      shopId,
      logOrderId: order._id,
      receiver: { email: user.email },
      data: { userName: user.first_name, orderNumber: order.orderNumber, orderId: order._id },
    });
  }
}

function getTemplateTypeAndMailType(status: string): [string, MailType] {
  switch (status) {
    case "paid":
      return ["paymentReceivedUser", "paymentReceivedNotify"];

    case "shipped":
      return ["orderShipped", "orderShippedNotify"];

    case "delivered":
      return ["orderDelivered", "orderArrivedNotify"];

    case "cancelled":
      return ["orderCancelledUser", "orderCancelledNotify"];

    case "refunded":
      return ["paymentRefunded", "paymentRefundedNotify"];
    default:
      return null;
  }
}

async function updateOrderRewards(paymentStatus: PaymentStatus, order: OrderDocLean) {
  switch (paymentStatus) {
    case "paid":
      await rewardCore.activateRecords(order._id);
      break;
    case "refunded":
      await rewardCore.cancelRecords(order._id);
      break;
    default:
      break;
  }
}

export default { update, updateShipAddr, list, get, createNote, updateNote, resendEmail };
