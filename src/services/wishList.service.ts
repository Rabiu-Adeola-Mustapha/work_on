import Debug from "debug";
import express from "express";
import { body, check } from "express-validator";

import currencyCore from "../core/currency.core";
import currencyMw from "../middleware/currency.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import { ProductDocLean, resProduct } from "../models/product.model";
import ShopModel from "../models/shop.model";
import WishListModel from "../models/wishList.model";

// eslint-disable-next-line
const debug = Debug("project:cart.service");

const getId = [
  shopIdMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const wishList = await WishListModel.create({ shopId: req.shop._id });

      res.json({
        wishListId: wishList._id,
      });
    } catch (e) {
      next(e);
    }
  },
];

const get = [
  shopIdMw,
  localeMw,
  currencyMw,
  check("wishListId").exists().isMongoId().withMessage("Missing wishList id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [wishList, shop] = await Promise.all([
        WishListModel.findById(req.data.wishListId)
          .populate({
            path: "productIds",
            populate: ["featured_media_id", "rewardPayout", "category_ids"],
          })
          .lean(),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      const products = (wishList?.productIds as ProductDocLean[])?.map((p) =>
        resProduct(p, req.locale, currencyCore.getCurrency(req), shop)
      );

      res.json({ products });
    } catch (e) {
      next(e);
    }
  },
];

const update = [
  shopIdMw,
  body("wishListId").exists().withMessage("Missing wishList id"),
  body("addId").optional().isMongoId().withMessage("Missing product id"),
  body("deleteId").optional().isMongoId().withMessage("Missing product id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await WishListModel.findOneAndUpdate(
        {
          _id: req.data.wishListId,
          shopId: req.shop._id,
        },
        {
          $push: { productIds: req.data.addId },
          $pull: { productIds: req.data.deleteId },
        },
        { new: true }
      );
      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

export default {
  getId,
  get,
  update,
};
