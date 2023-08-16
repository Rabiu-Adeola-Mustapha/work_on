import Debug from "debug";
import express from "express";

import AdminUserModel from "../models/adminUser.model";
import adminUserUtil from "../utils/adminUser.utils";

// eslint-disable-next-line
const debug = Debug("project:adminQueryAuth");

export default async function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const token = req.query.loginTokenAdmin as string;

    if (token === undefined) {
      res.status(401).json({ message: "tokenNotExists" });
      return;
    }

    const decoded = await adminUserUtil.decodeToken(token);

    const user = await AdminUserModel.findById(decoded.userId, ["_id", "type", "email"]).lean();

    if (!user) {
      res.status(401).json({ message: "Unable to find user" });
      return;
    }

    req.adminUser = user;
    next();
  } catch (e) {
    console.error("Unable to validate token", e);
    res.status(401).json({ message: "invalidToken" });
  }
}
