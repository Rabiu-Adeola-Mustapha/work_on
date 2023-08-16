import express from "express";
import mongoose from "mongoose";

import ShopModel from "../models/shop.model";
import { ShopUserType } from "../models/shopUser.model";

export default async function isShopAdminMw(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (await isShopAdmin(req.shop._id, req.adminUser._id)) {
    return next();
  }

  res.status(401).json({ message: "isNotShopAdmin" });
}

async function isShopAdmin(shopId: mongoose.Types.ObjectId, adminUserId: mongoose.Types.ObjectId) {
  const rst = await ShopModel.exists({
    _id: shopId,
    users: {
      $elemMatch: {
        type: ShopUserType.admin,
        admin_user_id: adminUserId,
      },
    },
  });

  return rst !== null;
}
