import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import reviewCore from "../core/review.core";
import frontAuth from "../middleware/frontAuth.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import OrderModel from "../models/order.model";
import ReviewModel from "../models/review.model";

// eslint-disable-next-line
const debug = Debug("project:review.service");

const create = [
  shopIdMw,
  frontAuth,
  body("productId").isMongoId().withMessage("Missing productId"),
  body("rating").isNumeric().withMessage("Missing comment"),
  body("comment").optional().isString().withMessage("Missing comment"),
  body("orderId").optional().isMongoId().withMessage("missing orderId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const review = await ReviewModel.create({
        shopId: req.shop._id,
        userId: req.frontUser._id,
        productId: req.data.productId,
        rating: req.data.rating,
        orderId: req.data.orderId,
        comment: req.data.comment,
      });

      const order = await OrderModel.findOneAndUpdate(
        { _id: req.data.orderId },
        { $set: { "products.$[elem].rating": review.rating } },
        { arrayFilters: [{ "elem._id": { $eq: req.data.productId } }], new: true }
      );

      res.json({ review, products: order.products });
    } catch (e) {
      next(e);
    }
  },
];

const list = [
  shopIdMw,
  localeMw,
  query("productId").isMongoId().withMessage("Missing product Id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [reviews, size] = await Promise.all([
        ReviewModel.find({ productId: req.data.productId }),
        ReviewModel.countDocuments({ productId: req.data.productId }),
      ]);

      const average = await reviewCore.calculateAvgRatings(req.data.productId);

      res.json({
        size,
        average,
        list: reviews,
      });
    } catch (e) {
      next(e);
    }
  },
];

const getPending = [
  shopIdMw,
  frontAuth,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const orders = await OrderModel.aggregate([
        { $unwind: "$products" },
        {
          $match: {
            userId: req.frontUser._id,
            status: "delivered",
            "products.rating": { $exists: false },
          },
        },
      ]);

      res.json(orders.map((o) => o.products));
    } catch (e) {
      next(e);
    }
  },
];

export default {
  list,
  create,
  getPending,
};
