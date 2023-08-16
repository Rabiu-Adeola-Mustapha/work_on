import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";

import currencyCore from "../core/currency.core";
import rewardCore from "../core/reward.core";
import shippingFeeCore from "../core/shippingFee.core";
import currencyMw from "../middleware/currency.mw";
import frontAuth from "../middleware/frontAuth.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CheckoutSessionModel, { CheckoutSessionDocLean } from "../models/checkoutSession.model";
import ProductModel, { ProductDocLean, resProduct } from "../models/product.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:checkout.service");

// array of product id and quantity
const createSession = [
  shopIdMw,
  frontAuth,
  body("items").isArray({ min: 1 }).withMessage("items is not an array"),
  body("items.*.productId").isMongoId().withMessage("Invalid items.*.productId"),
  body("items.*.quantity").isInt().withMessage("Invalid items.*.quantity"),
  body("items.*.discountPrice").optional().isNumeric().withMessage("Invalid items.*.discountPrice"),
  body("items.*.discountLinkId").optional().isString().withMessage("Invalid discountLinkId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const products = await ProductModel.find({
        shop_id: req.shop._id,
        _id: { $in: req.data.items.map((i: any) => i.productId) },
      }).lean();

      const data = getValidItems(req.data.items, products);

      const session = await CheckoutSessionModel.create({
        shop_id: req.shop._id,
        user_id: req.frontUser._id,
        items: data,
      });

      res.json({
        id: session._id,
      });
    } catch (e) {
      next(e);
    }
  },
];

const getSession = [
  shopIdMw,
  frontAuth,
  localeMw,
  currencyMw,
  query("id").isMongoId().withMessage("Invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [session, shop] = await Promise.all([
        CheckoutSessionModel.findOne({
          shop_id: req.shop._id,
          user_id: req.frontUser._id,
          _id: req.data.id,
        })
          .populate({
            path: "items.product_id",
            populate: [{ path: "featured_media_id" }, { path: "category_ids" }],
          })
          .lean(),

        ShopModel.findById(req.shop._id),
      ]);

      if (!session) {
        res.status(401).json({ msg: "notFound" });
        return;
      }

      res.json(await resSession(session, shop, req.locale, currencyCore.getCurrency(req)));
    } catch (e) {
      next(e);
    }
  },
];

async function resSession(session: CheckoutSessionDocLean, shop: ShopDocLean, locale: string, currency: string) {
  const items = session.items.map((i) => {
    const product = i.product_id as ProductDocLean;

    return {
      product: resProduct(product, locale, currency, shop),
      quantity: i.quantity,
      price: i.quantity * product.price,
      discountPrice: i.quantity * i.discount_price,
      discountLinkId: i.attached_to,
    };
  });

  const total = items.reduce((previousValue, current) => {
    const { price, discountPrice } = current;
    const activePrice = discountPrice > 0 ? discountPrice : price;
    return previousValue + activePrice;
  }, 0);

  const orderRewardPoints = await rewardCore.calculateOrderReward(
    session.shop_id as mongoose.Types.ObjectId,
    session._id as mongoose.Types.ObjectId
  );
  const userRewardPoints = await rewardCore.getUserRewardPoints(
    session.shop_id as mongoose.Types.ObjectId,
    session.user_id as mongoose.Types.ObjectId
  );

  return {
    id: session._id,
    shopId: session.shop_id,
    userId: session.user_id,
    items,
    total: {
      // null - not determined
      // 0 - free shipping
      shipping: null as number,
      tax: null as number,
      itemsTotal: total,
      total: null as number, // total is no determined before shipping is set
      currency,
      orderRewardPoints,
      userRewardPoints,
    },
  };
}

const updateSession = [
  shopIdMw,
  frontAuth,
  localeMw,
  currencyMw,
  query("id").isMongoId().withMessage("Invalid id"),
  body("items").isArray().withMessage("items is not an array"),
  body("items.*.productId").isMongoId().withMessage("Invalid items.*.productId"),
  body("items.*.quantity").isInt().withMessage("Invalid items.*.quantity"),
  body("items.*.discountPrice").optional().isNumeric().withMessage("Invalid items.*.disctounPrice"),
  body("items.*.discountLinkId").optional().isString().withMessage("Invalid discountLinkId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [products, shop] = await Promise.all([
        ProductModel.find({
          shop_id: req.shop._id,
          _id: { $in: req.data.items.map((i: any) => i.productId) },
        }).lean(),

        ShopModel.findById(req.shop._id),
      ]);

      const data = getValidItems(req.data.items, products);

      const session = await CheckoutSessionModel.findByIdAndUpdate(
        {
          _id: req.data.id,
        },
        { $set: { items: data } },
        { new: true }
      )
        .populate({
          path: "items.product_id",
          populate: [{ path: "featured_media_id" }, { path: "category_ids" }],
        })
        .lean();

      if (!session) {
        res.status(401).json({ msg: "notFound" });
        return;
      }

      res.json(await resSession(session, shop, req.locale, currencyCore.getCurrency(req)));
    } catch (e) {
      next(e);
    }
  },
];

const getValidItems = (items: any[], products: ProductDocLean[]) => {
  return items
    .map((i: any) => {
      const product = products.find((p) => p._id.equals(i.productId));
      return {
        product_id: i.productId as string,
        quantity: i.quantity as number,
        item_price: product?.price,
        discount_price: i?.discountPrice,
        attached_to: i.discountLinkId,
      };
    })
    .filter((i) => i.item_price !== null || i.item_price !== undefined);
};

const calculateShipping = [
  shopIdMw,
  frontAuth,
  localeMw,
  query("sessionId").isMongoId().withMessage("Invalid sessionId"),
  query("countryId").isMongoId().withMessage("Invalid countryId"),
  query("hkRegionId").isMongoId().optional().withMessage("Invalid hkRegionId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const fees = await shippingFeeCore.calculate({
        shopId: req.shop._id,
        userId: req.frontUser._id,
        countryId: req.data.countryId,
        sessionId: req.data.sessionId,
        hkRegionId: req.data.hkRegionId,
        locale: req.locale,
      });

      res.json(fees);
    } catch (e) {
      next(e);
    }
  },
];

const calculateTotal = [
  shopIdMw,
  frontAuth,
  localeMw,
  currencyMw,
  query("sessionId").isMongoId().withMessage("Invalid sessionId"),
  query("countryId").isMongoId().withMessage("Invalid countryId"),
  query("shipOptionId").isMongoId().withMessage("Invalid shipOptionId"),
  query("usedReward").isNumeric().optional().withMessage("Invalid usedReward"),
  query("hkRegionId").isMongoId().optional().withMessage("Invalid hkRegionId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const orderRewardPoints = await rewardCore.calculateOrderReward(req.shop._id, req.data.sessionId);
      const userRewardPoints = await rewardCore.getUserRewardPoints(req.shop._id, req.frontUser._id);
      const usedPoints = Number(req.data.usedReward);

      const total = await shippingFeeCore.calculateTotal({
        shopId: req.shop._id,
        userId: req.frontUser._id,
        countryId: req.data.countryId,
        sessionId: req.data.sessionId,
        locale: req.locale,
        shipOptionId: req.data.shipOptionId,
        hkRegionId: req.data.hkRegionId,
        usedReward: usedPoints ? userRewardPoints : 0, // cast to boolean and use reward points calculated from the backend instead of frontend
      });

      // debug("calculateTotal", {
      //   shipping: total.shipping,
      //   shippingExtra: total.shippingExtra,
      //   tax: total.tax,
      //   itemsTotal: total.itemsTotal,
      //   total: total.total,
      //   status: total.status,
      //   currency: currencyCore.getCurrency(req),
      //   userRewardPoints,
      //   orderRewardPoints,
      // });

      res.json({
        shipping: total.shipping,
        shippingExtra: total.shippingExtra,
        tax: total.tax,
        itemsTotal: total.itemsTotal,
        total: total.total,
        status: total.status,
        currency: currencyCore.getCurrency(req),
        userRewardPoints,
        orderRewardPoints,
      });
    } catch (e) {
      next(e);
    }
  },
];

export default {
  createSession,
  getSession,
  updateSession,
  calculateShipping,
  calculateTotal,
};
