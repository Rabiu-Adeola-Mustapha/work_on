import axios from "axios";
import Debug from "debug";
import express from "express";
import { query } from "express-validator";
import mongoose from "mongoose";
import Stripe from "stripe";

import mailCore from "../core/mail.core";
import rewardCore from "../core/reward.core";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import AdminUserModel from "../models/adminUser.model";
import { LogPoJo } from "../models/log.model";
import { MailType } from "../models/mail.model";
import OrderModel, { OrderDocLean } from "../models/order.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import UserModel from "../models/user.model";
import Config from "../utils/config";
import { generatePaypalAccessToken } from "./order.service";

// eslint-disable-next-line
const debug = Debug("project:pay.service");

const stripeWebhook = [
  query("shopId").isString().withMessage("invalid shop Id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const shop = await ShopModel.findById({ _id: req.data.shopId }).lean();
    let event = req.body;

    try {
      //  verify stripe signature when it is coming from the webhook.
      if (event.source !== "client" && event.source !== "test") {
        event = verifyStripeWebhook(shop, req);
      }

      const orderId = event.data.object.client_reference_id;
      const dateTime = event.created * 1000;

      switch (event.type) {
        case "checkout.session.completed":
          await updateOrderAndPayment(orderId, req.data.shopId, "success", "stripe", dateTime, event.source);
          break;

        case "checkout.session.expired":
          await updateOrderAndPayment(orderId, req.data.shopId, "canceled", "stripe", dateTime, event.source);
          break;

        default:
          res.send(400).send({ message: "unhandled event type" });
      }
      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  },
];

const paypalWebhook = [
  query("shopId").isString().withMessage("invalid shop Id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const data = req.body;
    const shop = await ShopModel.findById({ _id: req.data.shopId }).lean();

    try {
      if (data.source !== "client" && data.source !== "test") {
        // verify that the webhook is actually from paypal
        const headers = req.headers;
        const sandboxEnvs = ["test", "development"];
        const payPalKey = shop.payments.paypal;
        const clientId = sandboxEnvs.includes(process.env.NODE_ENV) ? payPalKey.test_key : payPalKey.prod_key;
        const secretKey = sandboxEnvs.includes(process.env.NODE_ENV) ? payPalKey.test_secret : payPalKey.prod_secret;
        const webhookId = sandboxEnvs.includes(process.env.NODE_ENV)
          ? payPalKey.webhook_test_secret
          : payPalKey.webhook_prod_secret;

        await verifyPaypalWebhook(headers, clientId, secretKey, webhookId, data);
      }

      const orderId = data.resource.purchase_units[0].custom_id;

      switch (data.event_type) {
        case "CHECKOUT.ORDER.APPROVED":
          await updateOrderAndPayment(orderId, req.data.shopId, "success", "paypal", data.create_time, data.source);
          break;

        case "CHECKOUT.ORDER.VOIDED":
          await updateOrderAndPayment(orderId, req.data.shopId, "canceled", "paypal", data.create_time, data.source);
          break;

        default:
          res.send(400).send({ message: "unhandled event type" });
      }
      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  },
];

const codWebhook = [
  shopIdMw,
  query("orderId").isMongoId().withMessage("missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [shop, order] = await Promise.all([
        ShopModel.findById({ _id: req.shop._id }).lean(),
        OrderModel.findById({ _id: req.data.orderId }).lean(),
      ]);

      const status = await OrderModel.updateOne(
        {
          shopId: shop._id,
          _id: req.data.orderId,
        },
        { $set: { status: "processing" } }
      );

      if (status.modifiedCount === 1) {
        return res.json({ message: "success" });
      }

      // TODO: add payment submitted to template type
      await sendAndLogEmail(shop._id, order, "orderCreatedNotify", "paymentSubmitted");
      return res.status(400).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

async function updateOrderAndPayment(
  orderId: string,
  shopId: mongoose.Types.ObjectId,
  status: string,
  paymentType: string,
  date: string | number,
  source: string
) {
  const order = await OrderModel.findById({ _id: orderId }).lean();
  const orderStatus = status === "success" ? "processing" : "pending";
  const prevPaymentStatus = order.paymentStatus;
  const newPaymentStatus = status === "success" ? "paid" : "canceled";
  //   const isMismatched = prevPaymentStatus !== "awaiting" && prevPaymentStatus !== newPaymentStatus;

  /*
   the webhook is called twice for most orders. It is called from the client
   to account for the case of webhook not being sent on time and only updates the
   order status. Only the webhook whose source is verified can update the payment status
   and send confirmation email.
   */
  if (source !== "client") {
    const logs: Array<Omit<LogPoJo, "createdAt">> = [
      { changeType: "orderStatus", prevValue: order.status, newValue: orderStatus },
      { changeType: "paymentStatus", prevValue: prevPaymentStatus, newValue: newPaymentStatus },
    ];

    await OrderModel.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          status: orderStatus,
          paymentStatus: newPaymentStatus,
          updatedAt: new Date(date),
        },
        $push: { logs: { $each: logs } },
      }
    );

    if (newPaymentStatus === "paid") {
      await rewardCore.activateRecords(order._id);
    }

    //  const mailType: MailType = isMismatched ? "orderMismatchNotify" : "orderCreatedNotify";
    //  await sendAndLogEmail(shopId, order, mailType, "paymentReceived");
  } else if (prevPaymentStatus === "awaiting") {
    await OrderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: orderStatus, updatedAt: new Date(date) } });
  }
}

function verifyStripeWebhook(shop: ShopDocLean, req: express.Request) {
  const sandboxEnvs = ["test", "development"];
  const stripeKeys = shop.payments.stripe;
  const secretKey = sandboxEnvs.includes(process.env.NODE_ENV) ? stripeKeys.test_secret : stripeKeys.prod_secret;
  const webhookSecret = sandboxEnvs.includes(process.env.NODE_ENV)
    ? stripeKeys.webhook_test_secret
    : stripeKeys.webhook_prod_secret;

  const stripe = new Stripe(secretKey, { apiVersion: "2022-11-15" });
  const signature = req.headers["stripe-signature"];

  return stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
}

async function verifyPaypalWebhook(headers: any, clientId: string, secretKey: string, webhookId: string, data: any) {
  const payload = {
    auth_algo: headers["paypal-auth-algo"],
    cert_url: headers["paypal-cert-url"],
    transmission_id: headers["paypal-transmission-id"],
    transmission_sig: headers["paypal-transmission-sig"],
    transmission_time: headers["paypal-transmission-time"],
    webhook_id: webhookId,
    webhook_event: data,
  };

  const accessToken = await generatePaypalAccessToken(clientId, secretKey);
  const url = `${Config.paypal.baseUrl}/v1/notifications/verify-webhook-signature`;

  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const result = await axios.post(url, payload, config);
  return result;
}

async function sendAndLogEmail(
  shopId: mongoose.Types.ObjectId,
  order: OrderDocLean,
  mailType: MailType,
  templateType: string
) {
  const [user, shop] = await Promise.all([
    UserModel.findOne({ shop_id: shopId, _id: order.userId }).lean(),
    ShopModel.findById({ _id: shopId }).lean(),
  ]);

  const adminIds = shop.users.map((user: any) => user.admin_user_id);
  const adminUsers = await AdminUserModel.find({ _id: { $in: adminIds } });
  const adminMails = adminUsers.map((user) => user.email);

  const options = {
    templateType,
    mailType,
    shopId,
    logOrderId: order._id,
    data: { userName: user.first_name, orderNumber: order.orderNumber, orderId: order._id },
  };

  await Promise.all([
    mailCore.sendMailWithTemplate({ ...options, receiver: { email: user.email } }),
    mailCore.sendMailWithTemplate({ ...options, receiver: { email: adminMails } }),
  ]);
}

export default {
  stripeWebhook,
  paypalWebhook,
  codWebhook,
};
