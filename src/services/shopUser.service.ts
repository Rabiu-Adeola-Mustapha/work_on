import crypto from "crypto";

import { addMinutes, isBefore } from "date-fns";
import addDays from "date-fns/addDays";
import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import nodemailer from "nodemailer";

import frontUserCore from "../core/frontUser.core";
import rewardCore from "../core/reward.core";
import frontAuthMw from "../middleware/frontAuth.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CartModel from "../models/cart.model";
import MailModel from "../models/mail.model";
import ShopModel from "../models/shop.model";
import UserModel, { AuthProvider, UserDocLean } from "../models/user.model";
import WishListModel from "../models/wishList.model";
import smsService from "../services/sms.service";
import adminUserUtil from "../utils/adminUser.utils";

// eslint-disable-next-line
const debug = Debug("project:user.service");

function mergeMobileNumber(countryCode: number, mobileNumber: number) {
  return `${countryCode}${mobileNumber}`;
}

const register = [
  shopIdMw,
  body("firstName").isString().exists().withMessage("Invalid firstName"),
  body("lastName").isString().exists().withMessage("Invalid lastName"),
  body("countryCode").isNumeric().exists().withMessage("Invalid countryCode"),
  body("mobileNumber").isNumeric().exists().withMessage("Invalid mobileNumber"),
  body("email").isEmail().optional().withMessage("Invalid email"),
  body("password")
    .isString()
    // eslint-disable-next-line
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[_\-!@#\$%\^&\*]).{8,}$/)
    .exists()
    .withMessage("Invalid password"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mobileNumber = mergeMobileNumber(req.data.countryCode, req.data.mobileNumber);

      // check if userAlreadyExists
      await checkUserExist(req.shop._id, req.data.email, mobileNumber, res);

      const otp = adminUserUtil.generateSmsOtp();
      const user = await UserModel.create({
        shop_id: req.shop._id,
        first_name: req.data.firstName,
        last_name: req.data.lastName,
        mobile_number: mobileNumber,
        mobile_number_verified: false,
        email: req.data.email,
        email_verified: false,
        password_hash: await adminUserUtil.generateHash(req.data.password),
        internal_password: await adminUserUtil.randomInternalPassword(),
        provider: AuthProvider.local,
        provider_id: mobileNumber,
        sms_otp: otp,
        sms_otp_created_at: Date.now(),
      });

      await smsService.sendSms(user, req.shop._id);

      res.json({
        userId: user._id,
      });
    } catch (e) {
      next(e);
    }
  },
];

const checkUserExist = async (shopId: string, email: string, mobile: string, res: express.Response) => {
  const mobileUser = await UserModel.findOne({ shop_id: shopId, mobile_number: mobile });
  const emailUser = await UserModel.findOne({ shop_id: shopId, email });

  if (mobileUser && emailUser) res.status(401).json({ message: "userAlreadyExists" });
  if (mobileUser) res.status(401).json({ message: "mobileAlreadyExists" });
  if (emailUser) res.status(401).json({ message: "emailAlreadyExists" });
};

const loginByMobile = [
  shopIdMw,
  body("countryCode").isNumeric().exists().withMessage("Invalid lastName"),
  body("mobileNumber").isNumeric().exists().withMessage("Invalid lastName"),
  body("password").isString().exists().withMessage("Invalid password"),
  body("cartId").isMongoId().optional().withMessage("Invalid cartId"),
  body("wishListId").isMongoId().optional().withMessage("Invalid wishListId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        mobile_number: mergeMobileNumber(req.body.countryCode, req.body.mobileNumber),
      });

      if (user && !user?.mobile_number_verified) {
        return res.status(401).json({ message: "mobileNeedVerify" });
      }

      await login(user, req, res);
    } catch (e) {
      next(e);
    }
  },
];

const loginByEmail = [
  shopIdMw,
  body("email").isEmail().exists().withMessage("Invalid userId"),
  body("password").isString().exists().withMessage("Invalid password"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        email: req.data.email,
      }).lean();

      // removing this.  should stil allow to do all operations even email is not verified
      // only different is that they won't receive email notification
      // if (!user?.email_verified) {
      //   return res.status(401).json({ message: "emailNotVerified" });
      // }

      await login(user, req, res);
    } catch (e) {
      next(e);
    }
  },
];

async function login(user: UserDocLean, req: express.Request, res: express.Response) {
  if (user === undefined || user === null) {
    return res.status(401).json({ message: "Unable to find user" });
  }

  // if (user.status !== UserStatusType.active) {
  //   return res.status(401).json({ message: `User status is '${user.status}'` });
  // }

  const verifyRst = await adminUserUtil.verifyPassword(req.data.password, user.password_hash);

  if (!verifyRst) {
    return res.status(401).json({ message: "Wrong password" });
  }
  const token = await adminUserUtil.generateTokenFront(user);

  if (!req.data.cartId && !req.data.wishListId) {
    return res.json({ token });
  }

  const { cartId, wishListId } = await getUpdatedCarts(user, req);

  res.json({ token, cartId, wishListId });
}

async function getUpdatedCarts(user: UserDocLean, req: express.Request) {
  const [cart, wishList] = await Promise.all([
    CartModel.findById(req.data.cartId).lean(),
    WishListModel.findById(req.data.wishListId).lean(),
  ]);

  let newCart;
  let newList;

  if (cart?.items) {
    newCart = await CartModel.findOneAndUpdate(
      { user_id: user._id, shop_id: req.shop._id },
      { $addToSet: { items: cart.items } },
      { new: true, upsert: true }
    );
  }

  //   some shops don't have wishlist so an id might not always be present
  if (wishList?.productIds) {
    newList = await WishListModel.findOneAndUpdate(
      { userId: user._id, shopId: req.shop._id },
      { $addToSet: { productIds: wishList.productIds } },
      { new: true, upsert: true }
    );
  }

  return { cartId: newCart?._id, wishListId: newList?.id };
}

const verifySmsOtp = [
  shopIdMw,
  body("countryCode").isNumeric().exists().withMessage("Invalid lastName"),
  body("mobileNumber").isNumeric().exists().withMessage("Invalid lastName"),
  body("otp").isString().exists().withMessage("Invalid otp"),
  body("resetPwd").isBoolean().optional().withMessage("Invalid resetPwd"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mobileNumber = mergeMobileNumber(req.data.countryCode, req.data.mobileNumber);

      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        mobile_number: mobileNumber,
      }).lean();

      const { rst, message } = adminUserUtil.verifySmsOtp(user, req.data.otp);

      if (!rst) {
        return res.status(401).json({ message });
      }

      await UserModel.findByIdAndUpdate(user._id, {
        $set: {
          sms_otp: undefined,
          sms_otp_created_at: undefined,
          mobile_number_verified: true,
        },
      });

      if (req.data.resetPwd) {
        const frontUser = await frontUserCore.setResetPwdToUser({
          shop_id: req.shop._id,
          mobile_number: mobileNumber,
        });

        const fullShop = await ShopModel.findById(req.shop._id).lean();
        const url = frontUserCore.getResetPwdUrl(fullShop, frontUser);

        return res.json({
          message: "success",
          resetPwdUrl: url,
        });
      }

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const getSmsOtp = [
  shopIdMw,
  query("countryCode").isNumeric().exists().withMessage("Invalid lastName"),
  query("mobileNumber").isNumeric().exists().withMessage("Invalid lastName"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      if (process.env.NODE_ENV !== "test") {
        return res.status(401).end();
      }

      const mobileNumber = mergeMobileNumber(req.data.countryCode, req.data.mobileNumber);

      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        mobile_number: mobileNumber,
      }).lean();

      res.json({
        otp: user.sms_otp,
      });
    } catch (e) {
      next(e);
    }
  },
];

const getUpdatingSmsOtp = [
  shopIdMw,
  query("countryCode").isNumeric().exists().withMessage("Invalid lastName"),
  query("mobileNumber").isNumeric().exists().withMessage("Invalid lastName"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      if (process.env.NODE_ENV !== "test") {
        return res.status(401).end();
      }

      const mobileNumber = mergeMobileNumber(req.data.countryCode, req.data.mobileNumber);

      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        updating_mobile_number: mobileNumber,
      }).lean();

      res.json({
        otp: user.updating_sms_otp,
      });
    } catch (e) {
      next(e);
    }
  },
];

const resendOtp = [
  shopIdMw,
  body("countryCode").isNumeric().exists().withMessage("Invalid lastName"),
  body("mobileNumber").isNumeric().exists().withMessage("Invalid lastName"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mobileNumber = mergeMobileNumber(req.data.countryCode, req.data.mobileNumber);

      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        mobile_number: mobileNumber,
      }).lean();

      const otp = adminUserUtil.generateSmsOtp();

      if (user.sms_otp_created_at !== undefined && user.sms_otp_created_at !== null) {
        const createdAtPlusOne = addMinutes(new Date(user.sms_otp_created_at), 1);

        if (isBefore(new Date(), createdAtPlusOne)) {
          return res.status(401).json({ message: "tooOften" });
        }
      }

      await UserModel.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            sms_otp: otp,
            sms_otp_created_at: Date.now(),
          },
        }
      ).lean();

      const updatedUser = await UserModel.findById(user._id).lean();

      await smsService.sendSms(updatedUser, req.shop._id);

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const requestResetPwd = [
  shopIdMw,
  body("email").isEmail().withMessage("invalid email"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();
      const rst = await frontUserCore.requestResetPwd(shop, req.data.email);

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
  shopIdMw,
  body("code").isString().withMessage("Invalid code"),
  body("userId").isMongoId().withMessage("Invalid userId"),
  body("password").exists().withMessage("Invalid password"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      debug("userId", req.data.userId);
      debug("shop", req.shop._id);

      const user = await UserModel.findOne({
        _id: req.data.userId,
        shop_id: req.shop._id,
      }).lean();

      if (!user) {
        return res.status(401).json({ message: "noUser" });
      }
      // 10 days
      const isExpired = isBefore(addDays(user.resetPwCodeDate, 10), new Date());

      if (isExpired) {
        return res.status(401).json({ message: "expired" });
      }

      if (req.data.code !== user.resetPwCode) {
        return res.status(401).json({ message: "invalidCode" });
      }

      const status = await UserModel.updateOne(
        {
          _id: req.data.userId,
          shop_id: req.shop._id,
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

const getProfile = [
  shopIdMw,
  frontAuthMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        _id: req.frontUser._id,
      })
        .select("first_name last_name mobile_number mobile_number_verified email email_verified provider picture_url")
        .lean();

      if (!user) {
        return res.status(401).json({ message: "invalidUser" });
      }

      res.json({
        firstName: user.first_name,
        lastName: user.last_name,
        mobileNumber: user.mobile_number,
        mobileNumberVerified: user.mobile_number_verified,
        email: user.email,
        emailVerified: user.email_verified,
        provider: user.provider,
        pictureUrl: user.picture_url,
        userRewardPoints: await rewardCore.getUserRewardPoints(req.shop._id, req.frontUser._id),
      });
    } catch (e) {
      next(e);
    }
  },
];

const updateProfile = [
  shopIdMw,
  frontAuthMw,
  body("firstName").isString().exists().withMessage("Invalid firstName"),
  body("lastName").isString().exists().withMessage("Invalid lastName"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await UserModel.findOneAndUpdate(
        {
          shop_id: req.shop._id,
          _id: req.frontUser._id,
        },
        { $set: { first_name: req.data.firstName, last_name: req.data.lastName } }
      );

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const updateEmail = [
  shopIdMw,
  frontAuthMw,
  body("email").isEmail().withMessage("Invalid email"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const existingUser = await UserModel.findOne(
        {
          shop_id: req.shop._id,
          email: req.data.email,
        },
        "_id"
      ).lean();

      if (existingUser) {
        return res.status(401).json({ message: "emailExists" });
      }

      const rst = await UserModel.updateOne(
        {
          shop_id: req.shop._id,
          _id: req.frontUser._id,
        },
        { $set: { email: req.data.email, email_verified: false, email_verification_code: null } }
      );

      if (rst.modifiedCount) {
        return res.json({ message: "success" });
      }

      return res.status(401).json({ message: "error", ...rst });
    } catch (e) {
      next(e);
    }
  },
];

const updateTelVerifySmsOtp = [
  shopIdMw,
  frontAuthMw,
  body("otp").isString().exists().withMessage("Invalid otp"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await UserModel.findById(req.frontUser).lean();

      const { rst, message } = adminUserUtil.verifySmsOtpUpdating(user, req.data.otp);

      if (!rst) {
        return res.status(401).json({ message });
      }

      await UserModel.findByIdAndUpdate(user._id, {
        $set: {
          sms_otp: undefined,
          sms_otp_created_at: undefined,

          updating_sms_otp: undefined,
          updating_sms_otp_created_at: undefined,

          mobile_number: user.updating_mobile_number,
          mobile_number_verified: true,

          updating_mobile_number: undefined,
        },
      });

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const updateTel = [
  shopIdMw,
  frontAuthMw,
  body("countryCode").isNumeric().withMessage("Invalid countryCode"),
  body("mobileNumber").isNumeric().withMessage("Invalid mobileNumber"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mobileNumber = mergeMobileNumber(req.data.countryCode, req.data.mobileNumber);

      const existingUser = await UserModel.findOne(
        {
          shop_id: req.shop._id,
          mobile_number: mobileNumber,
        },
        "_id"
      ).lean();

      if (existingUser) {
        return res.status(401).json({ message: "telExists" });
      }

      const otp = adminUserUtil.generateSmsOtp();

      const updatedUser = await UserModel.findOneAndUpdate(
        {
          shop_id: req.shop._id,
          _id: req.frontUser._id,
        },
        {
          $set: {
            updating_mobile_number: mobileNumber,
            updating_sms_otp: otp,
            updating_sms_otp_created_at: Date.now(),
          },
        }
      );

      if (updatedUser) {
        await smsService.sendSms(updatedUser, req.shop._id);

        return res.json({ message: "success" });
      }

      return res.status(401).json({ message: "userNotFound" });
    } catch (e) {
      next(e);
    }
  },
];

const verifyEmail = [
  shopIdMw,
  frontAuthMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        _id: req.frontUser._id,
      }).lean();

      if (user.email_verified) {
        return res.status(405).json({ message: "emailVerified" });
      }

      const shopDoc = await ShopModel.findById(req.shop._id, ["smtp_from", "smtp_transport", "root_url"]).lean();

      const uuid = crypto.randomUUID();
      const url = `${shopDoc.root_url}/profile/verifyEmailCode?code=${uuid}&userId=${user._id.toString() as string}`;
      const msgHtml = `Your link is:<br /><a href="${url}">${url}</a>`;

      const transporter = nodemailer.createTransport(shopDoc.smtp_transport);
      const mailOptions = {
        from: shopDoc.smtp_from,
        to: user.email,
        subject: "Verify Your Email ✔",
        html: msgHtml,
      };

      await UserModel.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            email_verification_code: uuid,
          },
        }
      );

      const mail = await MailModel.create({
        shopId: req.shop._id,
        userId: user._id,
        message: mailOptions,
        mailType: "emailVerification",
      });

      res.json(200).end();

      const info = await transporter.sendMail(mailOptions);
      await MailModel.findOneAndUpdate(
        { _id: mail._id },
        {
          $set: {
            sentInfo: info,
          },
        }
      );
    } catch (e) {
      next(e);
    }
  },
];

const verifyEmailCode = [
  body("userId").isMongoId().exists().withMessage("Invalid or missing userId"),
  body("code").exists().withMessage("Missing code"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      debug("verifyEmailCode req", req.data);

      const user = await UserModel.findById(req.data.userId).lean();

      if (!user) {
        return res.status(401).json({ message: "missingUser" });
      }

      if (user.email_verification_code !== req.data.code) {
        return res.status(401).json({ message: "invalidCode" });
      }

      if (user.email_verified) {
        return res.status(401).json({ message: "alreadyVerified" });
      }

      await UserModel.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            email_verified: true,
          },
        }
      );

      res.status(200).end();
    } catch (e) {
      next(e);
    }
  },
];

export default {
  register,
  loginByEmail,
  loginByMobile,
  verifySmsOtp,
  getSmsOtp,
  getUpdatingSmsOtp,
  resendOtp,
  requestResetPwd,
  resetPwd,
  getProfile,
  updateProfile,
  updateEmail,
  verifyEmail,
  verifyEmailCode,
  updateTel,
  updateTelVerifySmsOtp,
};
