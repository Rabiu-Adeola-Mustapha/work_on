import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import adminUserCore from "../core/adminUser.core";
import localeCore from "../core/locale.core";
import isShopAdminMw from "../middleware/isShopAdmin.tw";
import localeMw from "../middleware/locale.mw";
import merchantIdMw from "../middleware/merchantId.mw";
// import merchantIdMw from "../middleware/merchantId.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import AdminUserModel, { AdminUserDocLean } from "../models/adminUser.model";
import MerchantModel, { MerchantDocLean } from "../models/merchant.model";
import { MerchantUserDocLean } from "../models/merchantUser.model";

// eslint-disable-next-line
const debug = Debug("project:adminMerchant.service");

// async function isMerchantAdmin(merchantId: mongoose.Types.ObjectId, adminUserId: mongoose.Types.ObjectId) {
//   const rst = await MerchantModel.exists({
//     _id: merchantId,
//     users: {
//       $elemMatch: {
//         admin_user_id: adminUserId,
//       },
//     },
//   });

//   return rst !== null;
// }

// async function isMerchantAdminMw(req: express.Request, res: express.Response, next: express.NextFunction) {
//   if (await isMerchantAdmin(req.merchant._id, req.adminUser._id)) {
//     return next();
//   } else {
//     res.status(401).json({
//       message: "notMerchantAdmin",
//     });
//   }
// }

const addUser = [
  merchantIdMw,
  body("email").isEmail().exists().withMessage("Invalid email"),
  body("type").isIn(["merchantAdmin", "merchantShopManager"]).withMessage("Invalid merchant type"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const adminUser = await AdminUserModel.findOne({ email: req.data.email }).lean();

      if (adminUser === null) {
        const createdAdminUser = await adminUserCore.addUserCreateNew(req.data.email);

        await MerchantModel.findOneAndUpdate(
          {
            _id: req.merchant._id,
          },
          {
            $push: {
              users: {
                admin_user_id: createdAdminUser._id,
                type: req.data.type,
              },
            },
          }
        );
      }

      res.json({ message: "success" });

      await MerchantModel.updateOne(
        {
          _id: req.merchant._id,
        },
        {
          $push: {
            users: {
              admin_user_id: req.adminUser._id,
              type: req.data.type,
            },
          },
        }
      );
    } catch (e) {
      next(e);
    }
  },
];

const merchantValidators = [
  body("name.en").optional().isString().withMessage("Invalid name en"),
  body("name.zhHant").optional().isString().withMessage("Invalid name zhHant"),
  body("name.zhHans").optional().isString().withMessage("Invalid name zhHans"),
];

const create = [
  shopIdMw,
  isShopAdminMw,
  ...merchantValidators,
  validateResult,
  //   isMerchantAdmin,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const doc = await MerchantModel.create({
        shop_id: req.shop._id,
        ...req.data,
      });

      res.json({
        merchantId: doc._id,
      });
    } catch (e) {
      next(e);
    }
  },
];

const list = [
  shopIdMw,
  isShopAdminMw,
  localeMw,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const merchants = await MerchantModel.find({
        shop_id: req.shop._id,
      })
        .populate(["logo_media_id"])
        .lean();

      // debug("merchants", merchants);
      res.json(merchants.map((m) => responseMerchantLocale(req.locale, m)));
    } catch (e) {
      next(e);
    }
  },
];

const single = [
  shopIdMw,
  isShopAdminMw,
  localeMw,
  query("merchantId").isMongoId().exists().withMessage("Invalid merchantId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const merchant = await MerchantModel.findOne({
        shop_id: req.shop._id,
        _id: req.data.merchantId,
      })
        .populate(["logo_media_id", "users.admin_user_id"])
        .lean();

      // debug("single", merchant);
      res.json(responseMerchant(merchant));
    } catch (e) {
      next(e);
    }
  },
];

function responseMerchantLocale(locale: string, merchant: MerchantDocLean) {
  // debug("responseMerchant locale", locale);
  return {
    id: merchant._id,
    name: localeCore.getDefaultLocaleText(locale, merchant.name),
  };
}

function responseMerchant(merchant: MerchantDocLean) {
  return {
    id: merchant._id,
    name: merchant.name,
    users: merchant.users.map(responseUser),
  };
}

function responseUser(user: MerchantUserDocLean) {
  return {
    id: (user.admin_user_id as AdminUserDocLean)._id,
    email: (user.admin_user_id as AdminUserDocLean).email,
    status: (user.admin_user_id as AdminUserDocLean).status,
    type: user.type,
    createdAt: user.created_at,
  };
}

export default {
  create,
  list,
  single,
  addUser,
};
