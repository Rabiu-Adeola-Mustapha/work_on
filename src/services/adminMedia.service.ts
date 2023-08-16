import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";
import multer from "multer";

import mediaCore from "../core/media.core";
import productCore from "../core/product.core";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import MediaModel, { MediaDoc, MediaDocLean } from "../models/media.model";
import ProductModel from "../models/product.model";
import ShopModel from "../models/shop.model";
import config from "../utils/config";
import s3Util from "../utils/s3.utils";

const debug = Debug("project:adminMedia.service");

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      debug("multer storage", config.imageFolder);
      cb(null, config.imageFolder);
    },
  }),
});

const upload = [
  shopIdMw,
  mediaUpload.array("media"),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();

      const files = req.files as Express.Multer.File[];

      const mediaList = await Promise.all(
        files.map((file) => mediaCore.uploadToS3AndSaveDb(file, shop, req.adminUser))
      );

      await productCore.addMediaListToProduct(mediaList);

      res.json(mediaList.map(responseMedia));
    } catch (e) {
      next(e);
    }
  },
];

interface MediaFilter {
  paging: {
    size: number;
    page: number;
  };
  isLinkProducts?: boolean;
  search: string;
}

const list = [
  shopIdMw,
  query("paging.size").default(20).isNumeric().withMessage("Invalid size"),
  query("paging.page").default(1).isNumeric().withMessage("Invalid page"),
  query("isLinkProducts").default(false).isBoolean().withMessage("invalid isLinkProducts"),
  query("search").isString().optional().withMessage("Invalid search"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const filter = req.data as MediaFilter;
      debug("list params", req.data);

      const query: mongoose.FilterQuery<MediaDoc> = {
        shopId: req.shop._id,
      };

      const [mediaList, total] = await Promise.all([
        MediaModel.find(query)
          .skip((filter.paging.page - 1) * filter.paging.size)
          .limit(filter.paging.size)
          .sort({ createdAt: -1 })
          .lean(),
        MediaModel.countDocuments(query),
      ]);

      const list = mediaList.map(responseMedia);

      if (filter.isLinkProducts) {
        await Promise.all(list.map((r) => populateLinkProducts(r)));
      }

      res.json({
        total,
        list,
      });
    } catch (e) {
      next(e);
    }
  },
];

async function populateLinkProducts(mediaRes: MediaRes) {
  const products = await ProductModel.find({
    $or: [
      { featured_media_id: mediaRes.id },
      { gallery_ids: { $in: [mediaRes.id] } },
      { description_gallery_ids: { $in: [mediaRes.id] } },
    ],
  })
    .populate(["sku"])
    .lean();

  mediaRes.products = products.map((p) => {
    return { id: p._id, sku: p.sku };
  });
}

const listByIds = [
  shopIdMw,
  body("ids").isArray().withMessage("Invalid ids"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mediaList = await MediaModel.find({
        shopId: req.shop._id,
        _id: { $in: req.data.ids },
      }).lean();

      res.json(mediaList.map(responseMedia));
    } catch (e) {
      next(e);
    }
  },
];

const deleteObject = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [shop, media] = await Promise.all([
        ShopModel.findById(req.shop._id).lean(),
        MediaModel.findById({ _id: req.body.id }),
      ]);

      const record = await mediaCore.deleteFromS3AndDb(shop._id, media);

      await productCore.removeMediaFromProduct(shop._id, media._id);

      if (record.deletedCount === 1) {
        return res.json({ message: "deleted" });
      }

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

interface MediaProduct {
  id: string;
  sku: string;
}

interface MediaRes {
  id: mongoose.Types.ObjectId;
  height: number;
  width: number;
  url: string;
  filename: string;
  size: string;
  thumbnailUrl: string;
  thumbnailHeight: number;
  thumbnailWidth: number;
  products: MediaProduct[];
}

export function responseMedia(media: MediaDocLean): MediaRes {
  return {
    id: media._id,
    height: media.height,
    width: media.width,
    url: media.url,
    filename: media.filename,
    size: media.size,
    thumbnailUrl: media.thumbnailUrl,
    thumbnailHeight: media.thumbnailHeight,
    thumbnailWidth: media.thumbnailWidth,
    products: null,
  };
}

async function deleteAllObjects() {
  if (process.env.NODE_ENV !== "test") {
    throw Error("deleteAllObjects is only permitted to run in test environment.");
  }

  await s3Util.deleteExpiredObjects();
}

export default { upload, deleteObject, deleteAllObjects, list, listByIds };
