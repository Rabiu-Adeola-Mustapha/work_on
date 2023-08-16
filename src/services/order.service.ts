import crypto from "crypto";

import axios from "axios";
import Debug from "debug";
import type express from "express";
import { body, check, matchedData, param, query } from "express-validator";
import mongoose from "mongoose";
import multer from "multer";
import Stripe from "stripe";

import counterCore from "../core/counter.core";
import currencyCore from "../core/currency.core";
import localeCore from "../core/locale.core";
import mailCore from "../core/mail.core";
import mediaCore from "../core/media.core";
import orderCore from "../core/order.core";
import rewardCore from "../core/reward.core";
import frontAuth from "../middleware/frontAuth.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import verifyTestCode from "../middleware/verityTestCode.mw";
import CartModel from "../models/cart.model";
import CountryModel from "../models/country.model";
import { LogPoJo } from "../models/log.model";
import { MailType } from "../models/mail.model";
import OrderModel, { OrderDoc, OrderDocLean, OrderPoJo, resOrder } from "../models/order.model";
import { OrderProductDocLean } from "../models/orderProduct.model";
import { PaymentSessionDocLean } from "../models/paymentSession.model";
import PaySettingModel, { CodSetting, PaySettingDocLean } from "../models/paySetting.model";
import ProductModel from "../models/product.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import UserModel, { UserDocLean } from "../models/user.model";
import Config from "../utils/config";
import { responseMedia } from "./adminMedia.service";

const debug = Debug("project:order.service");

const list = [
  shopIdMw,
  frontAuth,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [orders, shop] = await Promise.all([
        OrderModel.find({
          shopId: req.shop._id,
          userId: req.frontUser._id,
        })
          .sort({ createdAt: -1 })
          .populate(["paymentProofId"])
          .lean(),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      res.json(orders.map((order) => resOrder(order, shop, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

const single = [
  shopIdMw,
  frontAuth,
  localeMw,
  param("orderId").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [order, shop] = await Promise.all([
        OrderModel.findOne({
          _id: req.data.orderId,
          shopId: req.shop._id,
        })
          .populate(["paymentProofId"])
          .lean(),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      res.json(resOrder(order, shop, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

async function validateShipDetails(req: express.Request, res: express.Response, next: express.NextFunction) {
  const { addrType } = matchedData(req);
  switch (addrType) {
    case "regular":
      await body("shipAddrId").isMongoId().withMessage("invalid shipAddrId").run(req);
      break;

    case "sfLocation":
      await body("sfLocation.code").isString().withMessage("invalid code").run(req);
      await body("sfLocation.subDistrict").optional().isString().withMessage("invalid subDistrict").run(req);
      await body("sfLocation.address").optional().isString().withMessage("invalid address").run(req);
      await body("sfLocation.servicePartner").isString().withMessage("invalid servicePartner").run(req);
      await body("sfLocation.shippingMethod").isString().withMessage("invalid shippingMethod").run(req);
      await body("sfLocation.isHot").isString().withMessage("invalid isHot").run(req);
      await body("sfLocation.hoursMonFri").optional().isString().withMessage("invalid hoursMonFri").run(req);
      await body("sfLocation.hoursSatSun").optional().isString().withMessage("invalid hoursSatSun").run(req);
      break;

    case "pickupLocation":
      await body("pickupAddr.countryId").isString().withMessage("invalid countryId").run(req);
      await body("pickupAddr.addr").isString().withMessage("invalid address").run(req);
      await body("pickupAddr.tel").isString().withMessage("invalid tel").run(req);
      await body("pickupAddr.openingHour").isString().withMessage("invalid openingHour").run(req);
      break;
    default:
      break;
  }
  next();
}

const createOrderValidators = [
  shopIdMw,
  frontAuth,
  localeMw,
  body("countryId").isString().withMessage("Invalid countryId"),
  body("currency").isString().withMessage("invalid currency"),
  body("taxTotal").optional().isNumeric().withMessage("invalid tax"),
  body("itemsTotal").isNumeric().withMessage("invalid items total"),
  body("addrType").isString().withMessage("invalid addrType"),
  body("shipId").isString().withMessage("invalid shipId"),
  body("shipName").isString().withMessage("invalid ship name"),
  body("shipType").isIn(["basic", "sf", "pickup"]).withMessage("invalid ship type"),
  validateShipDetails,
  body("shipping").isNumeric().withMessage("invalid shipping"),
  body("shippingExtra").optional({ nullable: true }).isNumeric().withMessage("invalid shipping extra"),
  body("total").optional().isNumeric().withMessage("invalid total"),
  body("orderRewardPoints").optional().isNumeric().withMessage("invalid order reward"),
  body("rewardUsed").optional().isNumeric().withMessage("invalid reward redeemed"),
  check("cartId").exists().isMongoId().withMessage("Missing cart id"),
  body("paymentId").isString().withMessage("invalid paymentId"),
  body("items").isArray().withMessage("items is not an array"),
  body("items.*.productId").isMongoId().withMessage("Invalid items.*.productId"),
  body("items.*.quantity").isInt().withMessage("Invalid items.*.quantity"),
  body("items.*.discountPrice").optional({ nullable: true }).isNumeric().withMessage("Invalid items.*.discountPrice"),
  body("items.*.discountLinkId")
    .if(body("items.*.discountPrice").isNumeric())
    .isString()
    .withMessage("Invalid items.*.discountLinkId"),
];

const create = [...createOrderValidators, validateResult, createOrder];

const create300Orders = [
  ...createOrderValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    for (let i = 0; i < 300; i++) {
      await createOrder(req, null, next);
    }

    res.status(200).end();
  },
];

const createTestOrders = [
  shopIdMw,
  verifyTestCode,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const product = await ProductModel.findOne({
        shop_id: req.shop._id,
      })
        .populate([
          "featured_media_id",
          "gallery_ids",
          "description_gallery_ids",
          "parent_id",
          "merchant_id",
          "category_ids",
          "relatedProductIds",
        ])
        .lean();

      const orderProducts = orderCore.getOrderProducts(
        [
          {
            productId: product._id,
            quantity: 1,
          },
        ],
        [product],
        "zh-Hants"
      );

      for (let i = 0; i < 10; i++) {
        const orderData: mongoose.AnyKeys<OrderDoc> = {
          shopId: req.shop._id,
          userId: (await UserModel.findOne({ shop_id: req.shop._id }))._id,
          orderNumber: await counterCore.getNextSequence(req.shop._id, "order"),
          status: "processing",
          products: orderProducts,
          currency: "HKD",
          countryId: (await CountryModel.findOne({ iso: "HK" }))._id,
          shipType: "sf",
          paymentStatus: "awaiting",
          addrType: "regular",
          shipName: "Local Express",
          shipOptionId: "64c1dbc737e09b7d287ed556",
          shipAddr: {
            addr_type: "regular",
            recipient_name: "Jason Ching",
            tel_country_code: "852",
            tel: "92608630",
            country_code: "852",
            address: "萬景峯1座19樓B室 (Address 2)",
            region: "Hong Kong",
            district: "Southern",
            subDistrict: "Ap Lei Chau",
          },
          shipping: 10,
          shipTotal: 10,
          itemsTotal: 102,
          taxTotal: 10,
          total: 112,
        };

        await OrderModel.create(orderData);
      }

      res.status(200).end();
    } catch (e) {
      console.error(e);
      next(e);
    }
  },
];

async function createOrder(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const [shop, user, payment, sequence, products] = await Promise.all([
      ShopModel.findById(req.shop._id).lean(),
      UserModel.findById({ _id: req.frontUser._id }).lean(),
      PaySettingModel.findById({ _id: req.data.paymentId }),
      counterCore.getNextSequence(req.shop._id, "order"),

      ProductModel.find({
        shop_id: req.shop._id,
        _id: { $in: req.data.items.map((i: any) => i.productId) },
      })
        .populate([
          "featured_media_id",
          "gallery_ids",
          "description_gallery_ids",
          "parent_id",
          "merchant_id",
          "category_ids",
          "relatedProductIds",
        ])
        .lean(),
    ]);

    const orderProducts = orderCore.getOrderProducts(req.data.items, products, req.locale);
    const createObj = convertToCreateObj(req, user, sequence, orderProducts, payment);
    const order = await OrderModel.create(createObj);

    const paymentSession = await getPaymentSession(shop, order, orderProducts, payment, req);

    const logs: Array<Omit<LogPoJo, "createdAt">> = [
      { changeType: "orderStatus", prevValue: null, newValue: "created" },
      { changeType: "paymentMethod", prevValue: null, newValue: req.data.paymentType },
    ];

    const [orderUpdateRes] = await Promise.all([
      // add logs and payment session
      OrderModel.findByIdAndUpdate(
        { _id: order._id },
        { $push: { payments: paymentSession, logs: { $each: logs } } },
        { rawResult: true, new: true }
      )
        .populate(["paymentProofId"])
        .lean(),

      // remove ordered items from cart
      CartModel.updateOne(
        { _id: req.data.cartId },
        { $pull: { items: { product_id: { $in: req.data.items.map((i: any) => i.productId) } } } },
        { new: true }
      ),
    ]);

    // send mails
    if (orderUpdateRes.lastErrorObject.updatedExisting) {
      const updatedOrder = orderUpdateRes.value;
      await rewardCore.createRecords(updatedOrder, updatedOrder.rewardPayout, updatedOrder.rewardRedeemed);
      await sendAndLogOrderEmails(shop._id, updatedOrder, user, req);
    }

    if (res) {
      res.json(resOrder(orderUpdateRes.value, shop, req.locale));
    }
  } catch (e) {
    console.error(e);
    next(e);
  }
}
const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      debug("multer storage", Config.imageFolder);
      cb(null, Config.imageFolder);
    },
  }),
});

const uploadProof = [
  shopIdMw,
  frontAuth,
  query("orderId").exists().isMongoId().withMessage("Missing id"),
  mediaUpload.array("media"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();

      const files = req.files as Express.Multer.File[];

      const mediaList = await Promise.all(
        files.map((file) => mediaCore.uploadToS3AndSaveDb(file, shop, req.frontUser))
      );

      await OrderModel.findOneAndUpdate(
        { shopId: shop._id, _id: req.data.orderId },
        {
          $set: {
            paymentProofId: mediaList[0]._id,
          },
        }
      ).lean();

      res.json(mediaList.map(responseMedia));
    } catch (e) {
      next(e);
    }
  },
];

const updatePaymentMethod = [
  shopIdMw,
  frontAuth,
  localeMw,
  body("id").isString().withMessage("Invalid orderId"),
  body("currency").isString().withMessage("invalid currency"),
  body("total").optional().isNumeric().withMessage("invalid total"),
  body("sessionId").isString().withMessage("invalid  sessionId"),
  body("paymentId").isString().withMessage("invalid paymentId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [shop, payment, order] = await Promise.all([
        ShopModel.findById(req.shop._id).lean(),
        PaySettingModel.findById({ _id: req.data.paymentId }),

        OrderModel.findOne({
          _id: req.data.id,
          shopId: req.shop._id,
        })
          .populate(["paymentProofId"])
          .lean(),
      ]);

      if (order.paymentStatus !== "awaiting") {
        return res.status(401).json({ message: "orderNotPending" });
      }

      const previousActivePayment = order.payments.find((payment) => payment.isActiveSession === true);

      const incomingPaymentTypeExists = order.payments.some((p) => {
        return p.payOptionId === payment._id.toString();
      });

      if (incomingPaymentTypeExists) {
        await OrderModel.findByIdAndUpdate(
          { _id: order._id },
          { $set: { "payments.$[elem].isActiveSession": true } },
          { arrayFilters: [{ "elem.payOptionId": { $eq: req.data.paymentId } }] }
        );
      } else {
        const newSession = await getPaymentSession(shop, order, order.products, payment, req);
        await OrderModel.findByIdAndUpdate({ _id: order._id }, { $push: { payments: newSession } }).lean();
      }

      const log: Omit<LogPoJo, "createdAt"> = {
        changeType: "paymentMethod",
        prevValue: previousActivePayment.paymentType as string,
        newValue: req.data.paymentType,
      };

      // deactivate all other paymentSessions and add log
      const updatedOrder = await OrderModel.findByIdAndUpdate(
        { _id: order._id },
        { $set: { "payments.$[elem].isActiveSession": false }, $push: { logs: log } },
        { new: true, arrayFilters: [{ "elem.payOptionId": { $ne: req.data.paymentId } }] }
      );

      res.json(resOrder(updatedOrder, shop, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

const cancel = [
  shopIdMw,
  frontAuth,
  query("orderId").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [shop, order] = await Promise.all([
        ShopModel.findById(req.shop._id).lean(),
        OrderModel.findById(req.data.orderId),
      ]);

      if (!["pending", "processing"].includes(order.status)) {
        return res.status(401).json({ message: `order${order.status}` });
      }

      if (order.paymentStatus === "awaiting") {
        await rewardCore.cancelRecords(order._id);
      }

      const status = await OrderModel.updateOne(
        { shopId: shop._id, _id: req.data.orderId },
        { $set: { status: "cancelled" } }
      ).lean();

      if (status.modifiedCount === 1) {
        return res.json({ message: "updated" });
      }

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

async function getPaymentSession(
  shop: ShopDocLean,
  order: OrderDocLean,
  products: OrderProductDocLean[],
  payment: PaySettingDocLean,
  req: express.Request
): Promise<PaymentSessionDocLean> {
  const data = req.data;

  const paymentData = await getPaymentData(
    shop,
    order._id,
    payment.payType,
    products,
    data.total ?? data.itemsTotal,
    data.currency,
    req.locale
  );

  return {
    currency: data.currency,
    payOptionId: payment._id,
    paymentName: payment.name,
    paymentType: payment.payType,
    sessionId: paymentData.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function getPaymentData(
  shop: ShopDocLean,
  orderId: string,
  paymentType: string,
  products: OrderProductDocLean[],
  total: any,
  currency: string,
  locale: string
) {
  switch (paymentType) {
    case "cod": {
      const uuid = crypto.randomUUID();
      return { name: "cod", id: uuid };
    }
    case "stripe":
      return await createStripeSession(shop, products, currency, orderId, locale);
    case "paypal":
      return await createPaypalSession(shop, total, currency, orderId);
    default:
      throw new Error(`unrecognized payment type`);
  }
}

async function createStripeSession(
  shop: ShopDocLean,
  products: OrderProductDocLean[],
  currency: string,
  orderId: string,
  locale: string
) {
  const sandboxEnvs = ["test", "development"];
  const stripeKeys = shop.payments.stripe;
  const secretKey = sandboxEnvs.includes(process.env.NODE_ENV) ? stripeKeys.test_secret : stripeKeys.prod_secret;
  const stripe = new Stripe(secretKey, { apiVersion: "2022-11-15" });

  try {
    const transformedItems = products.map((product: OrderProductDocLean) => {
      const productName = localeCore.getDefaultLocaleText(locale, product.name);
      const shopName = localeCore.getDefaultLocaleText(locale, shop.name);
      const productDescription = localeCore.getDefaultLocaleText(locale, product.description);

      const result = {
        price_data: {
          currency,
          product_data: {
            name: productName ?? `${shopName} product`,
            description: productDescription ?? `${shopName} product`,
          },
          unit_amount: product.price * 100,
        },
        quantity: product.quantity,
      };
      return result;
    });

    const data = await stripe.checkout.sessions.create({
      client_reference_id: `${orderId}`,
      payment_method_types: ["card"],
      line_items: transformedItems,
      mode: "payment",
      success_url: `${shop.root_url}/checkout/paymentStatus?orderId=${orderId}&&paymentType=STRIPE&&status=success`,
      cancel_url: `${shop.root_url}/checkout/paymentStatus?orderId=${orderId}&&paymentType=STRIPE&&status=cancel`,
    });
    return data;
  } catch (error) {
    throw new Error(error);
  }
}

async function createPaypalSession(shop: ShopDocLean, total: number, currency: string, orderId: string) {
  const sandboxEnvs = ["test", "development"];
  const payPalKey = shop.payments.paypal;
  const secretKey = sandboxEnvs.includes(process.env.NODE_ENV) ? payPalKey.test_secret : payPalKey.prod_secret;
  const clientId = sandboxEnvs.includes(process.env.NODE_ENV) ? payPalKey.test_key : payPalKey.prod_key;

  const accessToken: string = await generatePaypalAccessToken(clientId, secretKey);

  const url = `${Config.paypal.baseUrl}/v2/checkout/orders`;

  const orderData = {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: `${orderId}`,
        amount: {
          currency_code: currency,
          value: total,
        },
      },
    ],
  };

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const response = await axios.post(url, orderData, config);
  const data = response.data;
  return data;
}

export async function generatePaypalAccessToken(clientId: string, secretKey: string): Promise<string> {
  const res = await axios({
    method: "post",
    url: Config.paypal.accessTokenUrl,
    data: "grant_type=client_credentials",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept-Language": "en_US",
    },
    auth: {
      username: clientId,
      password: secretKey,
    },
  });

  return res.data.access_token;
}

function convertToCreateObj(
  req: express.Request,
  user: UserDocLean,
  sequence: number,
  products: OrderProductDocLean[],
  payment: PaySettingDocLean
): OrderPoJo {
  const { itemsTotal, taxTotal, shipping, shippingExtra, countryId, total, currency } = req.data;

  const isPaymentOnDelivery = (payment.setting as CodSetting).paymentOnDelivery;

  return {
    shopId: req.shop._id,
    userId: req.frontUser._id,
    orderNumber: sequence,
    status: isPaymentOnDelivery ? "processing" : "pending",
    paymentStatus: "awaiting",
    products,
    countryId,
    shipping,
    shippingExtra,
    shipTotal: Number(shipping) + Number(shippingExtra ?? 0),
    itemsTotal,
    taxTotal: taxTotal ?? 0,
    total: total ?? itemsTotal,
    currency,
    shipOptionId: req.data.shipId,
    shipType: req.data.shipType,
    addrType: req.data.addrType,
    shipName: req.data.shipName,
    ...orderCore.getOrderShipCreate(req, user),
    rewardPayout: req.data.orderRewardPoints,
    rewardRedeemed: req.data.rewardUsed,
  };
}

async function sendAndLogOrderEmails(
  shopId: mongoose.Types.ObjectId,
  order: OrderDocLean,
  user: UserDocLean,
  req: express.Request
) {
  const currency = currencyCore.getCurrency(req);
  const emailData = await orderCore.getEmailData(order._id, shopId.toString(), req.locale, currency);

  const mailOptions = {
    templateType: "orderCreatedUser",
    mailType: "orderCreatedNotify" as MailType,
    shopId,
    logOrderId: order._id, // needed to create send email log
    data: emailData,
  };

  // send and log email
  await mailCore.sendMailWithTemplate({
    ...mailOptions,
    receiver: { email: user.email },
  });
}

export default { create, create300Orders, createTestOrders, updatePaymentMethod, uploadProof, cancel, list, single };
