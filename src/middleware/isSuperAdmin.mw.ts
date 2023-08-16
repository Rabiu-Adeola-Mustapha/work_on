import Debug from "debug";
import express from "express";

import AdminUserModel, { AdminUserType } from "../models/adminUser.model";

// eslint-disable-next-line
const debug = Debug("project:isSuperAdmin.mw");

export default async function isSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = await AdminUserModel.findById(req.adminUser._id).lean();

  //   debug("user", user.type === AdminUserType.superAdmin);

  if (user.type === AdminUserType.superAdmin) {
    next();
    return;
  }

  res.status(401).json({ message: "isNotShopAdmin" });
}
