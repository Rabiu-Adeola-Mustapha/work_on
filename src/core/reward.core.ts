import Debug from "debug";
import mongoose from "mongoose";

import { CategoryDocLean } from "../models/category.model";
import CheckoutSessionModel from "../models/checkoutSession.model";
import { OrderDocLean } from "../models/order.model";
import { ProductDocLean } from "../models/product.model";
import RewardRecordModel from "../models/rewardRecord.model";
import ShopModel, { RewardRoundOff } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:reward.core");

async function calculateOrderReward(shopId: mongoose.Types.ObjectId, sessionId: mongoose.Types.ObjectId) {
  const [session, shop] = await Promise.all([
    CheckoutSessionModel.findById({ _id: sessionId }).populate({
      path: "items.product_id",
      populate: [{ path: "category_ids", select: "rewardPayout" }],
    }),
    ShopModel.findById({ _id: shopId }),
  ]);

  if (shop.rewardPayout === null) return null;

  //  Filter out discounted products from factoring into reward calculations
  const rewards = session.items.map((i) => {
    const product = i.product_id as ProductDocLean;
    const rewardPercent = calculateProductReward(shop.rewardPayout, product);
    const rewardValue = rewardPercent * product.price * i.quantity;
    return getRewardApprox(shop.rewardRoundOff, rewardValue);
  });

  return parseFloat(rewards.reduce((r, i) => r + i, 0).toFixed(2));
}

function getRewardApprox(rewardRoundOff: RewardRoundOff, rewardValue: number): number {
  switch (rewardRoundOff) {
    case "toFixed":
      return parseFloat(rewardValue.toFixed(2));
    case "roundUp":
      return parseFloat(rewardValue.toFixed(0));
    case "roundDown":
      return Math.floor(rewardValue);
    default:
      break;
  }
}

function calculateProductReward(shopRewardPayout: number, product: ProductDocLean) {
  if (shopRewardPayout === null || undefined) return null;

  const productReward = product?.rewardPayout;
  const categories = product?.category_ids as CategoryDocLean[];
  const categoryReward = categories?.find((c: CategoryDocLean) => c?.rewardPayout > 0)?.rewardPayout;

  let rewardPayout;
  if (productReward > 0) {
    rewardPayout = productReward;
  } else if (categoryReward > 0) {
    rewardPayout = categoryReward;
  } else {
    rewardPayout = shopRewardPayout;
  }
  return rewardPayout / 100;
}

interface RewardSum {
  _id: string;
  totalPoints: number;
}

async function getUserRewardPoints(shopId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId | string) {
  // for earned points only take active points into acount
  const earnedPoints: RewardSum[] = await RewardRecordModel.aggregate([
    { $match: { shopId, userId, points: { $gt: 0 }, status: "active" } },
    {
      $group: {
        _id: "$userId",
        totalPoints: { $sum: "$points" },
      },
    },
  ]);

  // for redeemed points take all points into account including points used on an order that
  // has not been paid for yet.
  const redeemedPoints: RewardSum[] = await RewardRecordModel.aggregate([
    { $match: { shopId, userId, points: { $lt: 0 }, status: { $in: ["pending", "active", "expired"] } } },
    {
      $group: {
        _id: "$userId",
        totalPoints: { $sum: "$points" },
      },
    },
  ]);

  debug(redeemedPoints);

  const earnedSum = earnedPoints[0]?.totalPoints;
  const redeemedSum = redeemedPoints[0]?.totalPoints;
  return parseFloat(earnedSum?.toFixed(2)) + parseFloat(redeemedSum?.toFixed(2)) ?? 0;
}

async function createRecords(order: OrderDocLean, earnedPoints: number, redeemedPoints: number) {
  if (earnedPoints > 0) {
    await RewardRecordModel.create({
      userId: order.userId,
      shopId: order.shopId,
      orderId: order._id,
      points: earnedPoints,
    });
  }

  // redeemed points are stored in negative values, such that the sum of all values
  // will give the available rewards to be redeemed at any point
  if (redeemedPoints > 0) {
    await RewardRecordModel.create({
      userId: order.userId,
      shopId: order.shopId,
      orderId: order._id,
      points: redeemedPoints * -1,
    });
  }
}

async function activateRecords(orderId: mongoose.Types.ObjectId) {
  try {
    await RewardRecordModel.updateMany({ orderId }, { $set: { status: "active" } });
  } catch (error) {
    throw new Error(error);
  }
}

async function cancelRecords(orderId: mongoose.Types.ObjectId) {
  try {
    const res = await RewardRecordModel.updateMany({ orderId }, { $set: { status: "cancelled" } });
    return res;
  } catch (error) {
    throw new Error(error);
  }
}

export default {
  calculateOrderReward,
  calculateProductReward,
  getUserRewardPoints,
  createRecords,
  activateRecords,
  cancelRecords,
};
