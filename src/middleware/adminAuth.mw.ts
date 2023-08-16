import Debug from "debug";
import express from "express";

import AdminUserModel from "../models/adminUser.model";
import adminUserUtil from "../utils/adminUser.utils";

// eslint-disable-next-line
const debug = Debug("project:adminAuth");

export default async function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers["x-access-token"] as string;

  if (
    req.path === "/login" ||
    req.path === "/verifyUser" ||
    req.path === "/verifyUserStatus" ||
    req.path === "/requestResetPwd" ||
    req.path === "/resetPwd" ||
    req.path === "/export/fullShop"
  ) {
    return next();
  }

  if (token === undefined) {
    res.status(401).json({ message: "tokenNotExists" });
    return;
  }

  try {
    const decoded = await adminUserUtil.decodeToken(token);

    const user = await AdminUserModel.findById(decoded.userId, ["_id", "type", "email"]).lean();

    if (!user) {
      res.status(401).json({ message: "invalidUser" });
      return;
    }

    req.adminUser = user;
    next();
  } catch (e) {
    console.error("Unable to validate token", e);
    res.status(401).json({ message: "invalidToken" });
  }
}
