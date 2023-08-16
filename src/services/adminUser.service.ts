import express from "express";

import shopIdMw from "../middleware/shopId.mw";
import UserModel, { UserDocLean } from "../models/user.model";

const list = [
  shopIdMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const users = await UserModel.find({
        shop_id: req.shop._id,
      }).lean();

      res.json(users.map(resUser));
    } catch (e) {
      next(e);
    }
  },
];

function resUser(user: UserDocLean) {
  return {
    id: user._id,
    firstName: user.first_name,
    lastName: user.last_name,
    mobileNumber: user.mobile_number,
    mobileNumberVerified: user.mobile_number_verified,
    email: user.email,
    emailVerified: user.email_verified,
    provider: user.provider,
    createdAt: user.created_at,
  };
}

export default { list };
