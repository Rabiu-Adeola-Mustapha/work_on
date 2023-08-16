import Debug from "debug";
import express from "express";
import { check } from "express-validator";
import mongoose from "mongoose";

import counterCore from "../core/counter.core";
import localeCore from "../core/locale.core";
import productCore from "../core/product.core";
import rewardCore from "../core/reward.core";
import currencyMw from "../middleware/currency.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CartModel, { CartDocLean, CartItemDocLean, CartItemPoJo, CartItemType } from "../models/cart.model";
import { CategoryDocLean } from "../models/category.model";
import { FxDocLean } from "../models/fx.model";
import { MediaDocLean, resMedia } from "../models/media.model";
import ProductModel, { ProductDocLean } from "../models/product.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:cart.service");

const getId = [
  shopIdMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const cart = await CartModel.create({ shop_id: req.shop._id });

      res.json({
        cartId: cart._id,
      });
    } catch (e) {
      next(e);
    }
  },
];

const addProduct = [
  shopIdMw,
  check("cartId").exists().withMessage("Missing cart id"),
  check("productId").exists().isMongoId().withMessage("Missing product id"),
  check("quantity").exists().withMessage("Missing quantiy"),
  check("discountPrice").optional().isNumeric().withMessage("Invalid Discount Price"),
  check("discountLinkId").optional().isString().withMessage("Invalid Discount LinkId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [product, cart] = await Promise.all([
        ProductModel.findById(req.data.productId, "price").lean(),
        CartModel.findById({ _id: req.data.cartId }).lean(),
      ]);

      // check if discount product has link in cart
      if (req.data.discountPrice) {
        const attachedToProduct = cart?.items.find(
          (item) => (item.product_id as mongoose.Types.ObjectId).toString() === req.data.discountLinkId
        );
        if (!attachedToProduct) {
          throw new Error("discount product can only be bought as additional item");
        }
      }

      const item: CartItemPoJo = {
        type: CartItemType.product,
        product_id: req.data.productId,
        quantity: req.data.quantity,
        item_price: product.price,
        discount_price: req.data.discountPrice,
        attached_to: req.data.discountLinkId,
      };

      await CartModel.findOneAndUpdate(
        {
          _id: cart._id,
          shop_id: req.shop._id,
        },
        {
          $addToSet: {
            items: item,
          },
        },
        { new: true, rawResult: true }
      );

      // debug(result);

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const removeProduct = [
  shopIdMw,
  check("cartId").exists().withMessage("Missing cart id"),
  check("productId").exists().isMongoId().withMessage("Missing product id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const product = await ProductModel.findById(req.data.productId, "price").lean();

      const result = await CartModel.findOneAndUpdate(
        {
          _id: req.data.cartId,
          shop_id: req.shop._id,
        },
        {
          $pull: { items: { $or: [{ product_id: product._id }, { attached_to: product._id }] } },
        },
        { new: true, rawResult: true }
      );

      if (result.lastErrorObject.updatedExisting) {
        return res.json({
          message: "success",
        });
      }

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

const updateQuantity = [
  shopIdMw,
  check("cartId").exists().withMessage("Missing cart id"),
  check("productId").exists().isMongoId().withMessage("Missing product id"),
  check("quantity").exists().withMessage("Missing quantiy"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await CartModel.findOneAndUpdate(
        {
          _id: req.body.cartId,
          shop_id: req.shop._id,
          "items.product_id": req.data.productId,
        },
        { $set: { "items.$.quantity": req.data.quantity } },
        { new: true, rawResult: true }
      );

      if (result.lastErrorObject.updatedExisting) {
        return res.json({
          message: "succes",
        });
      }

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

const get = [
  shopIdMw,
  localeMw,
  currencyMw,
  check("cartId").exists().isMongoId().withMessage("Missing cart id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [cart, shop] = await Promise.all([
        CartModel.findById(req.data.cartId)
          .populate({
            path: "items.product_id",
            populate: ["featured_media_id", "rewardPayout", "category_ids"],
          })
          .lean(),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      const fxPromise = productCore.getFxPromise(req);

      res.json(await responseCartDoc(cart, shop, req.locale, productCore.getRequestCurrency(req), fxPromise));
    } catch (e) {
      next(e);
    }
  },
];

const getCount = [
  shopIdMw,
  check("cartId").exists().isMongoId().withMessage("Missing cart id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await CartModel.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(req.data.cartId) },
        },
        {
          $project: {
            count: { $size: "$items" },
          },
        },
      ]);

      res.json({ count: result.length > 0 ? result[0].count : 0 });
    } catch (e) {
      console.error(e);
      next(e);
    }
  },
];

async function responseCartDoc(
  cartDoc: CartDocLean,
  shopDoc: ShopDocLean,
  locale: string,
  currency: string,
  fxPromise: any
) {
  const fx = fxPromise !== undefined ? await fxPromise : undefined;

  const obj = {
    id: cartDoc._id,
    items: cartDoc.items.map((i) => responseCartItem(i, locale, currency, fx, shopDoc)),
    currency,
  };

  return obj;
}

function responseCartItem(
  cartItem: CartItemDocLean,
  locale: string,
  currency: string,
  fxRecords: FxDocLean[],
  shop: ShopDocLean
) {
  return {
    type: cartItem.type,
    product: responseProduct(cartItem.product_id as ProductDocLean, locale, currency, fxRecords, shop),
    quantity: cartItem.quantity,
    itemPrice: cartItem.item_price,
    discountPrice: cartItem.discount_price,
    discountLinkId: cartItem.attached_to,
  };
}

function responseProduct(
  product: ProductDocLean,
  locale: string,
  currency: string,
  fxRecords: FxDocLean[],
  shop: ShopDocLean
) {
  const productNumber = counterCore.getFormattedSequence(shop.product_prefix, product.product_number);

  return {
    id: product._id,
    productNumber,
    prdouctReward: product.rewardPayout,
    categoryRewards: (product.category_ids as CategoryDocLean[]).map((c) => c.rewardPayout),
    name: localeCore.getDefaultLocaleText(locale, product.name),
    price: fxRecords === undefined ? product.price : productCore.calcualtePrice(product, fxRecords),
    description: localeCore.getDefaultLocaleText(locale, product.description),
    featureMedia: resMedia(product.featured_media_id as MediaDocLean),
    currency,
    rewardPayout: rewardCore.calculateProductReward(shop.rewardPayout, product),
  };
}

export default {
  getId,
  get,
  getCount,
  addProduct,
  removeProduct,
  updateQuantity,
};
