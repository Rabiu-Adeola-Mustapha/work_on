import Debug from "debug";
import express from "express";
import mongoose from "mongoose";

import ShopModel from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:shopIdQuery.mw");

export default async function shopId(req: express.Request, res: express.Response, next: express.NextFunction) {
  const shopId = req.query.shopId as string;

  if (!shopId) {
    res.status(401).json({ message: "missingShopId" });
    return;
  }

  if (!mongoose.isValidObjectId(shopId)) {
    res.status(401).json({ message: "invalidShopId" });
    return;
  }

  const shop = await ShopModel.findById(shopId, [
    "google_key_client_id",
    "google_key_secret",
    "default_locale",
    "default_currency",
  ]).lean();

  if (!shop) {
    res.status(401).json({ message: "shopIdNotExists" });
    return;
  }

  req.shop = shop;
  req.locale = shop.default_locale;
  next();
}
