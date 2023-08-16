import express from "express";
import { body, query } from "express-validator";

import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CouponModel from "../models/coupon.model";
import ShopModel from "../models/shop.model";
import { generateCouponCode, getDateFromString } from "../utils/coupon.utils";

const create = [
  shopIdMw,
  body("type").isIn(["percent", "fixed"]).withMessage("Invalid coupon type"),
  body("amount").isString().withMessage("invalid amount"),
  body("usageLimit").isNumeric().withMessage("invalid usage limit"),
  body("expirationDate").isString().withMessage("invalid expiration date"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();

      const { type, amount, usageLimit, expirationDate } = req.data;

      const code = await generateCouponCode(6);
      const expiration = getDateFromString(expirationDate);

      const coupon = await CouponModel.create({
        shopId: shop._id,
        code,
        type,
        amount,
        usageLimit,
        expirationDate: expiration,
      });

      res.json(coupon);
    } catch (e) {
      next(e);
    }
  },
];

const list = [
  shopIdMw,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const coupons = await CouponModel.find({ shopId: req.shop._id }).lean();

      res.json(coupons);
    } catch (e) {
      next(e);
    }
  },
];

const edit = [
  shopIdMw,
  query("couponId").exists().isMongoId().withMessage("Missing id"),
  body("usageLimit").isNumeric().withMessage("invalid usage limit"),
  body("expirationDate").isString().withMessage("invalid expiration date"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const expiration = getDateFromString(req.data.expirationDate);

      const coupon = await CouponModel.findOneAndUpdate(
        { _id: req.data.couponId, shopId: req.shop._id },
        {
          $set: {
            usageLimit: req.data.usageLimit,
            expirationDate: expiration,
          },
        },
        { new: true }
      );

      res.json(coupon);
    } catch (e) {
      next(e);
    }
  },
];

const getOne = [
  shopIdMw,
  query("couponId").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const coupon = await CouponModel.findOne({
        _id: req.data.couponId,
        shop_id: req.shop._id,
      }).lean();

      res.json(coupon);
    } catch (e) {
      next(e);
    }
  },
];

export default { create, list, edit, getOne };
