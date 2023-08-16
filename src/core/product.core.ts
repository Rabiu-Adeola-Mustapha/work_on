import path from "path";

import Debug from "debug";
import type express from "express";
import mongoose from "mongoose";

import FxModel, { FxDocLean } from "../models/fx.model";
import { MediaDocLean } from "../models/media.model";
import ProductModel, { ProductDocLean } from "../models/product.model";

// eslint-disable-next-line
const debug = Debug("project:product.core");

function getFxPromise(req: express.Request) {
  if (!isDoFxConvert(req)) return undefined;

  return FxModel.find({
    base: req.shop.default_currency,
    to: req.currency,
  })
    .sort({ date: -1 })
    .limit(1)
    .lean();
}

function isDoFxConvert(req: express.Request) {
  if (!req.currency) return false;

  return req.shop.default_currency !== req.currency;
}

function getRequestCurrency(req: express.Request) {
  return req.currency ?? req.shop.default_currency;
}

async function convertPrice(product: ProductDocLean, fxRecords: FxDocLean[]) {
  if (product === null) return;

  // const fxRecords = (await fxPromise) as FxDocLean[];
  if (fxRecords.length !== 1) {
    // Advoid showing the wrong price
    product.price = undefined;
    return;
  }

  // !! We need rounding!
  product.price = product.price * fxRecords[0].rate;
}

function calcualtePrice(product: ProductDocLean, fxRecords: FxDocLean[]) {
  if (product === null) return undefined;

  if (fxRecords.length !== 1) return undefined;

  // !! We need rounding!
  return (product.price = product.price * fxRecords[0].rate);
}

async function addMediaListToProduct(mediaList: MediaDocLean[]) {
  const rst = [];

  for (const media of mediaList) {
    rst.push(await addMediaToProduct(media));
  }

  return rst;
}

interface MediaToProductRst {
  media: MediaDocLean;
  productIdFeature: mongoose.Types.ObjectId;
  productIdGallery: mongoose.Types.ObjectId;
}

async function addMediaToProduct(media: MediaDocLean): Promise<MediaToProductRst> {
  // parse original file name
  // find sku

  return {
    media,
    productIdFeature: await addMediatoProductFeature(media),
    productIdGallery: await addMediaToProductGallery(media),
  };
}

async function addMediatoProductFeature(media: MediaDocLean) {
  const sku = path.parse(media.originalFilename).name;

  const rst = await ProductModel.findOneAndUpdate(
    {
      shop_id: media.shopId,
      sku: new RegExp(`^${sku}$`, "i"),
    },
    {
      $set: {
        featured_media_id: media._id,
      },
    }
  ).lean();

  // debug("addMediatoProductFeature rst", { file: media.originalFilename, sku, rst });
  return rst ? rst._id : null;
}

async function addMediaToProductGallery(media: MediaDocLean) {
  const filename = path.parse(media.originalFilename).name;

  const regex = /(.*)_\d+/;

  if (!regex.test(filename)) return false;

  const [, sku] = filename.match(regex);

  const rst = await ProductModel.findOneAndUpdate(
    {
      shop_id: media.shopId,
      sku: new RegExp(`^${sku}$`, "i"),
    },
    {
      $push: {
        gallery_ids: media._id,
      },
    }
  ).lean();

  // debug("addMediaToProductGallery rst", { fileApp: filename, originalFile: media.originalFilename, sku, rst });
  return rst ? rst._id : null;
}

async function removeMediaFromProduct(shopId: string, mediaId: string) {
  const res = await ProductModel.updateMany(
    {
      shop_id: shopId,
      $or: [
        { featured_media_id: mediaId },
        { gallery_ids: { $in: [mediaId] } },
        { description_gallery_ids: { $in: [mediaId] } },
      ],
    },
    {
      $unset: {
        featured_media_id: mediaId,
      },
      $pull: {
        gallery_ids: mediaId,
        description_gallery_ids: mediaId,
      },
    }
  );
  return res;
}

export default {
  getRequestCurrency,
  convertPrice,
  getFxPromise,
  calcualtePrice,
  addMediaListToProduct,
  removeMediaFromProduct,
};
