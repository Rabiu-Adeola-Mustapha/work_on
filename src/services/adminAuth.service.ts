import addDays from "date-fns/addDays";
import isBefore from "date-fns/isBefore";
import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";

import adminUserCore from "../core/adminUser.core";
import { validateResult } from "../middleware/validator.mw";
import AdminUserModel, { AdminUserStatus } from "../models/adminUser.model";
import { MediaDocLean } from "../models/media.model";
import MerchantModel, { MerchantDocLean } from "../models/merchant.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import adminUserUtil from "../utils/adminUser.utils";
import { responseMedia } from "./adminMedia.service";

// eslint-disable-next-line
const debug = Debug("project:adminAuth.service");

const login = [
  body("email").exists().isEmail().withMessage("Invalid email address"),
  body("password").exists().withMessage("Invalid password"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await AdminUserModel.findOne({ email: req.data.email }).lean();

      if (user === null) {
        return res.status(401).json({ message: "Unable to login.  Either your email address or password is wrong." });
      }

      const isPwValid = await adminUserUtil.verifyPassword(req.data.password, user.password_hash);

      if (!isPwValid) {
        return res.status(401).json({ message: "Unable to login.  Either your email address or password is wrong." });
      }

      const token = await adminUserUtil.generateToken(user);

      res.json({ token });
    } catch (e) {
      next(e);
    }
  },
];

const getShopList = [
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const merchants = await MerchantModel.find(
        {
          users: {
            $elemMatch: { admin_user_id: req.adminUser._id },
          },
        },
        ["shop_id", "users"]
      ).lean();

      const shops = await ShopModel.find({
        $or: [
          {
            _id: { $in: merchants.map((m) => m.shop_id) },
          },
          {
            users: {
              $elemMatch: { admin_user_id: req.adminUser._id },
            },
          },
        ],
      })
        .populate(["name", "locales", "logo_media_id"])
        .lean();

      res.json(shops.map((s) => responseShop(s, merchants, req.adminUser._id)));
    } catch (e) {
      next(e);
    }
  },
];

const me = [
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // user type
      // shop list
      res.json({
        _id: req.adminUser._id,
        type: req.adminUser.type,
        email: req.adminUser.email,
      });
    } catch (e) {
      next(e);
    }
  },
];

const verify = [
  body("userId").isMongoId().withMessage("invalid adminUserId"),
  body("emailVerificationCode").isString().withMessage("invalid emailVerificationCode"),
  body("password")
    .isString()
    // eslint-disable-next-line
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[_\-!@#\$%\^&\*]).{8,}$/)
    .withMessage("Invalid password"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const status = await AdminUserModel.updateOne(
        {
          _id: req.data.userId,
          email_verification_code: req.data.emailVerificationCode,
        },
        {
          $set: {
            status: AdminUserStatus.created,
            email_verification_code: undefined,
            password_hash: await adminUserUtil.generateHash(req.data.password),
          },
        }
      ).lean();

      if (status.modifiedCount === 1) {
        return res.json({ message: "success" });
      }

      return res.status(400).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

const checkVerifyStatus = [
  query("userId").isMongoId().withMessage("invalid userId"),
  query("emailVerificationCode").isString().withMessage("invalid emailVerificationCode"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const adminUser = await AdminUserModel.findOne({
        _id: req.data.userId,
        // email_verification_code: req.data.emailVerificationCode,
        // status: AdminUserStatus.pending,
      }).lean();

      if (!adminUser) {
        return res.json({ status: "failedOrNotExist" });
      }

      if (adminUser.status !== AdminUserStatus.pending) {
        return res.json({ status: "alreadyVerified" });
      }

      if (adminUser.email_verification_code !== req.data.emailVerificationCode) {
        return res.json({ status: "failedOrNotExist" });
      }

      res.json({ status: "pending" });
    } catch (e) {
      next(e);
    }
  },
];

function responseShop(shop: ShopDocLean, merchants: MerchantDocLean[], adminUserId: mongoose.Types.ObjectId) {
  const shopUser = shop.users.find((s) => (s.admin_user_id as mongoose.Types.ObjectId).equals(adminUserId));

  const merchant = merchants.find((m) => (m.shop_id as mongoose.Types.ObjectId).equals(shop._id));

  const merchantUser = merchant
    ? merchant.users.find((s) => (s.admin_user_id as mongoose.Types.ObjectId).equals(adminUserId))
    : undefined;

  return {
    id: shop._id,
    name: shop.name,
    locales: shop.locales,
    shopType: shop.shop_type,
    defaultLocale: shop.default_locale,
    userShopRole: shopUser ? shopUser.type : undefined,
    userMerchantRole: merchantUser ? merchantUser.type : undefined,
    logoMedia: shop.logo_media_id ? responseMedia(shop.logo_media_id as MediaDocLean) : undefined,
  };
}

const requestResetPwd = [
  body("email").isEmail().withMessage("Invalid email"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const rst = await adminUserCore.requestResetPwd(req.data.email);

      if (!rst.rst) {
        return res.status(401).json({
          message: rst.message,
        });
      }

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const resetPwd = [
  body("code").isString().withMessage("Invalid code"),
  body("userId").isMongoId().withMessage("Invalid userId"),
  body("password").exists().withMessage("Invalid password"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await AdminUserModel.findById(req.data.userId).lean();

      // 10 days
      const isExpired = isBefore(addDays(user.resetPwCodeDate, 10), new Date());

      if (isExpired) {
        return res.status(401).json({ message: "expired" });
      }

      if (req.data.code !== user.resetPwCode) {
        return res.status(401).json({ message: "invalidCode" });
      }

      const status = await AdminUserModel.updateOne(
        {
          _id: req.data.userId,
        },
        {
          $set: {
            resetPwCode: undefined,
            resetPwCodeDate: undefined,
            password_hash: await adminUserUtil.generateHash(req.data.password),
          },
        }
      ).lean();

      if (status.modifiedCount === 1) {
        return res.json({ message: "success" });
      } else {
        return res.status(401).json({ message: "wrong modifiedCount", status });
      }
    } catch (e) {
      next(e);
    }
  },
];

const changePwd = [
  body("currentPwd").isString().withMessage("invalid currentPwd"),
  body("newPwd")
    .isString()
    // eslint-disable-next-line
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[_\-!@#\$%\^&\*]).{8,}$/)
    .withMessage("invalid newPwd"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await AdminUserModel.findById(req.adminUser._id).lean();

      if (req.adminUser === null) {
        return res.status(401).json({ message: "noUser" });
      }

      const isPwValid = await adminUserUtil.verifyPassword(req.data.currentPwd, user.password_hash);

      if (!isPwValid) {
        return res.status(401).json({ message: "wrongCurrentPwd" });
      }

      const status = await AdminUserModel.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            resetPwCode: undefined,
            resetPwCodeDate: undefined,
            password_hash: await adminUserUtil.generateHash(req.data.newPwd),
          },
        }
      ).lean();

      if (status.modifiedCount === 1) {
        return res.json({ message: "success" });
      } else {
        return res.status(401).json({ message: "wrongModifiedCount", status });
      }
    } catch (e) {
      next(e);
    }
  },
];

export default { getShopList, login, me, verify, checkVerifyStatus, requestResetPwd, resetPwd, changePwd };
