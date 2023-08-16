import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import shopId from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import BannerModel, { BannerDocLean } from "../models/banner.model";

// eslint-disable-next-line
const debug = Debug("project:adminBannerService");

const create = [
  shopId,
  body("mediaId").isMongoId().withMessage("invalid mediaId"),
  body("groupName").isString().withMessage("invalid groupName"),
  body("url").isString().optional().withMessage("invalid url"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const lastBanner = await BannerModel.find({
        shopId: req.shop._id,
        groupName: req.data.groupName,
      })
        .sort({ order: "desc" })
        .limit(1)
        .lean();

      await BannerModel.create({
        shopId: req.shop._id,
        groupName: req.data.groupName,
        mediaId: req.data.mediaId,
        href: req.data.url,
        order: lastBanner.length === 0 ? 0 : lastBanner[0].order + 1,
      });

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const list: any = [];
const deleteRecord: any = [];
const reOrder: any = [];

// function resBanner(banner: BannerDocLean) {
//   return {
//     id: banner._id,
//   };
// }

export default {
  create,
  list,
  deleteRecord,
  reOrder,
};
