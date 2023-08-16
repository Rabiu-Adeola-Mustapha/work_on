import Debug from "debug";
import express from "express";
import mongoose from "mongoose";

import MerchantModel from "../models/merchant.model";

// eslint-disable-next-line
const debug = Debug("project:merchantId.mw");

export default async function merchantId(req: express.Request, res: express.Response, next: express.NextFunction) {
  let merchantId = req.headers["merchant-id"] as string;

  if (!merchantId) {
    merchantId = req.body.merchantId as string;

    if (!merchantId) {
      res.status(401).json({ message: "missingMerchantId" });
      return;
    }
  }

  if (!mongoose.isValidObjectId(merchantId)) {
    res.status(401).json({ message: "invalidMerchantId" });
    return;
  }

  const merchant = await MerchantModel.findById(merchantId, ["shop_id"]).lean();

  if (merchant === undefined) {
    res.status(401).json({ message: "shopIdNotExists" });
    return;
  }

  req.merchant = merchant;
  next();
}
