import Debug from "debug";
import express from "express";

import frontAuth from "../middleware/frontAuth.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { OrderDocLean } from "../models/order.model";
import RewardRecordModel, { RewardRecordDocLean } from "../models/rewardRecord.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:review.service");

const list = [
  shopIdMw,
  frontAuth,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();
      const allRewards = await RewardRecordModel.find({
        shopId: req.shop._id,
        userId: req.frontUser._id,
        status: { $in: ["active", "expired"] },
      })
        .sort({
          createdAt: -1,
        })
        .lean()
        .populate("orderId");

      res.json(allRewards.map((r) => resRewardRecord(r, shop, req.locale)));
    } catch (e) {
      console.error(e);
      next(e);
    }
  },
];

const resRewardRecord = (reward: RewardRecordDocLean, shop: ShopDocLean, locale: string) => {
  const order = reward.orderId as OrderDocLean;
  return {
    id: reward._id,
    points: reward.points,
    status: reward.status,
    orderTotal: order.total,
    orderDate: order.createdAt,
    currency: order.currency,
  };
};

export default {
  list,
};
