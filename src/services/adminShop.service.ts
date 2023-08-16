import Debug from "debug";
import express from "express";
import { body } from "express-validator";

import adminUserCore from "../core/adminUser.core";
import mailTemplateCore from "../core/mailTemplate.core";
import isShopAdminMw from "../middleware/isShopAdmin.tw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import AdminUserModel, { AdminUserDocLean } from "../models/adminUser.model";
import CounterModel from "../models/counter.model";
import { MediaDocLean, resMedia } from "../models/media.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import { ShopUserType } from "../models/shopUser.model";

// eslint-disable-next-line
const debug = Debug("project:adminShop.service");

const get = [
  shopIdMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findOne({
        _id: req.shop._id,
        users: {
          $elemMatch: {
            admin_user_id: req.adminUser._id,
          },
        },
      })
        .populate(["logo_media_id", "users.admin_user_id"])
        .lean();

      // debug("shop", shop);
      if (!shop) {
        return res.status(404).end();
      }

      res.json(resShop(shop));
    } catch (e) {
      next(e);
    }
  },
];

const shopValidators = [
  body("googleKeyClientId").isString().optional().withMessage("Invalid googleKeyClientId"),
  body("googleKeySecret").isString().optional().withMessage("Invalid googleKeySecret"),
  body("stripeKeyClientId").isString().optional().withMessage("Invalid stripeKeyClientId"),
  body("stripeKeySecret").isString().optional().withMessage("Invalid stripeKeySecret"),
  body("stripeTestKeyClientId").isString().optional().withMessage("Invalid stripeTestKeyClientId"),
  body("stripeTestKeySecret").isString().optional().withMessage("Invalid stripeTestKeySecret"),
  body("stripeWebhookSecret").isString().optional().withMessage("Invalid stripeWebhookSecret"),
  body("stripeTestWebhookSecret").isString().optional().withMessage("Invalid stripeTestWebhookSecret"),
  body("paypalKeyClientId").isString().optional().withMessage("Invalid paypalKeyClientId"),
  body("paypalKeySecret").isString().optional().withMessage("Invalid paypalKeySecret"),
  body("paypalTestKeyClientId").isString().optional().withMessage("Invalid paypalTestKeyClientId"),
  body("paypalTestKeySecret").isString().optional().withMessage("Invalid paypalTestKeySecret"),
  body("paypalWebhookSecret").isString().optional().withMessage("Invalid paypalWebhookSecret"),
  body("paypalTestWebhookSecret").isString().optional().withMessage("Invalid paypalTestWebhookSecret"),
  body("name.en").optional().isString().withMessage("Invalid name en"),
  body("name.zhHant").optional().isString().withMessage("Invalid name zhHant"),
  body("name.zhHans").optional().isString().withMessage("Invalid name zhHans"),
  body("locales").isArray().optional().withMessage("Invalid locales"),
  body("defaultLocale").isString().optional().withMessage("Invalid defaultLocale"),
  body("currencies").isArray().optional().withMessage("Invalid currencies"),
  body("defaultCurrency").isString().optional().withMessage("Invalid defaultCurrency"),
  body("smtpFrom").isString().optional().withMessage("Invalid smptFrom"),
  body("smtpTransport").isObject().optional().withMessage("Invalid smtpTransport"),
  body("rootUrl").isString().optional().withMessage("Invalid rootUrl"),
  body("logoMediaId").isMongoId().optional().withMessage("Invalid logiMediaId"),
  body("shopType").isIn(["regular", "multiMerchant"]).optional().withMessage("Invalid shopType"),
  body("shipSfEnabled").isBoolean().optional().withMessage("Invalid shipSfEnabled"),
  body("shipPickupEnabled").isBoolean().optional().withMessage("Invalid shipPickupEnabled"),
  body("shipBasicEnabled").isBoolean().optional().withMessage("Invalid shipBasicEnabled"),
  body("rewardPayout").isNumeric().optional().withMessage("Invalid rewardPayout"),
  body("accessYouUser").isString().optional().withMessage("Invalid accessYouUser"),
  body("accessYouAcctNo").isString().optional().withMessage("Invalid accessYouAcctNo"),
  body("accessYouPw").isString().optional().withMessage("Invalid accessYouPw"),
  body("otpMsg").isString().optional().withMessage("Invalid otpMsg"),
];

const update = [
  shopIdMw,
  ...shopValidators,
  validateResult,
  //   googleKey: {
  //     clientId: "250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com",
  //     secret: "GOCS
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const data = convertToUpdateObj(req.data);
      await ShopModel.findOneAndUpdate(
        {
          _id: req.shop._id,
          users: {
            $elemMatch: {
              admin_user_id: req.adminUser._id,
            },
          },
        },
        {
          $set: data,
        }
      );
      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const create = [
  ...shopValidators,
  body("code").isString().withMessage("missing code"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const data = convertToUpdateObj(req.data);
      data.code = req.data.code;

      data.users = [
        {
          admin_user_id: req.adminUser._id,
          type: ShopUserType.admin,
        },
      ];

      const shop = await ShopModel.create(data);

      await Promise.all([
        await CounterModel.create({ shopId: shop._id, counterType: "product" }),
        await CounterModel.create({ shopId: shop._id, counterType: "order" }),
        await mailTemplateCore.createMailTemplates(shop.id),
      ]);

      res.json({
        message: "success",
        shopId: shop._id,
      });
    } catch (e) {
      next(e);
    }
  },
];

const addUser = [
  shopIdMw,
  isShopAdminMw,
  body("email").isEmail().withMessage("Invalid email"),
  body("type").isIn(["admin", "shopManager"]).withMessage("Invalid type"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      let adminUser = await AdminUserModel.findOne({ email: req.data.email }).lean();

      if (adminUser === null) {
        adminUser = await adminUserCore.addUserCreateNew(req.data.email);
      }

      await ShopModel.findOneAndUpdate(
        {
          _id: req.shop._id,
        },
        {
          $push: {
            users: {
              admin_user_id: adminUser._id,
              type: req.data.type,
            },
          },
        }
      );

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const removeUser = [
  shopIdMw,
  isShopAdminMw,
  body("adminUserId").isMongoId().withMessage("Invalid adminUserId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await ShopModel.findOneAndUpdate(
        {
          _id: req.shop._id,
        },
        {
          $pull: {
            users: {
              admin_user_id: req.data.adminUserId,
            },
          },
        }
      );

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const resendInvitation = [
  body("email").isEmail().exists().withMessage("Invalid email"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await adminUserCore.resendInvitation(req.data.email);

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

// async function addUserCreateNew(email: string, shopId: mongoose.Types.ObjectId, adminUserType: AdminUserType) {
//   const uuid = crypto.randomUUID();

//   const createdAdminUser = await AdminUserModel.create({
//     type: AdminUserType.regular,
//     email,
//     email_verification_code: uuid,
//     status: AdminUserStatus.pending,
//     internal_password: await adminUserUtil.randomInternalPassword(),
//   });

//   await ShopModel.findOneAndUpdate(
//     {
//       _id: shopId,
//     },
//     {
//       $push: {
//         users: {
//           admin_user_id: createdAdminUser._id,
//           type: adminUserType,
//         },
//       },
//     }
//   );

//   await emailInvitation(createdAdminUser);
// }

function resShop(shop: ShopDocLean) {
  return {
    id: shop._id,
    locales: shop.locales,
    defaultLocale: shop.default_locale,
    currencies: shop.currencies,
    defaultCurrency: shop.default_currency,
    name: shop.name,
    smtpFrom: shop.smtp_from,
    smtpTransport: shop.smtp_transport,
    rootUrl: shop.root_url,
    googleKeyClientId: shop.google_key_client_id,
    stripeKeyClientId: shop.payments?.stripe?.prod_key,
    paypalKeyClientId: shop.payments?.paypal?.prod_key,
    stripeTestKeyClientId: shop.payments?.stripe?.test_key,
    paypalTestKeyClientId: shop.payments?.paypal?.test_key,
    shopType: shop.shop_type,
    shipSfEnabled: shop.ship_sf_enabled,
    shipPickupEnabled: shop.ship_pickup_enabled,
    shipBasicEnabled: shop.ship_basic_enabled,
    logoMedia: shop.logo_media_id ? resMedia(shop.logo_media_id as MediaDocLean) : undefined,
    shopUsers: shop.users.map((shopUser) => {
      const adminUser = shopUser.admin_user_id as AdminUserDocLean;
      return {
        adminUserId: adminUser._id,
        email: adminUser.email,
        status: adminUser.status,
        type: shopUser.type,
      };
    }),
    rewardPayout: shop.rewardPayout,
    accessYouUser: shop.accessYouUser,
    accessYouAcctNo: shop.accessYouAcctNo,
    accessYouPw: shop.accessYouPw,
    otpMsg: shop.otpMsg,
  };
}

function convertToUpdateObj(obj: any) {
  const data: any = {
    google_key_client_id: obj.googleKeyClientId,
    google_key_secret: obj.googleKeySecret,
    name: obj.name,
    locales: obj.locales,
    default_locale: obj.defaultLocale,
    currencies: obj.currencies,
    default_currency: obj.defaultCurrency,
    smtp_from: obj.smtpFrom,
    smtp_transport: obj.smtpTransport,
    root_url: obj.rootUrl,
    logo_media_id: obj.logoMediaId,
    shop_type: obj.shopType,
    ship_basic_enabled: obj.shipBasicEnabled,
    ship_pickup_enabled: obj.shipPickupEnabled,
    ship_sf_enabled: obj.shipSfEnabled,
    "payments.stripe.prod_key": obj.stripeKeyClientId,
    "payments.stripe.prod_secret": obj.stripeKeySecret,
    "payments.stripe.test_key": obj.stripeTestKeyClientId,
    "payments.stripe.test_secret": obj.stripeTestKeySecret,
    "payments.stripe.webhook_prod_secret": obj.stripeWebhookSecret,
    "payments.stripe.webhook_test_secret": obj.stripeTestWebhookSecret,
    "payments.paypal.prod_key": obj.paypalKeyClientId,
    "payments.paypal.prod_secret": obj.paypalKeySecret,
    "payments.paypal.test_key": obj.paypalTestKeyClientId,
    "payments.paypal.test_secret": obj.paypalTestKeySecret,
    "payments.paypal.webhook_prod_secret": obj.paypalWebhookSecret,
    "payments.paypal.webhook_test_secret": obj.paypalTestWebhookSecret,
    rewardPayout: obj.rewardPayout,
    accessYouUser: obj.accessYouUser,
    accessYouAcctNo: obj.accessYouAcctNo,
    accessYouPw: obj.accessYouPw,
    otpMsg: obj.otpMsg,
  };

  //   remove entry from the updateObj if the value  provided is undefined
  const cleanedUp = Object.entries(data).reduce((record: any, [key, value]: any[]) => {
    if (value) {
      return { ...record, [key]: value };
    } else return { ...record };
  }, {});

  return cleanedUp;
}

export default {
  get,
  update,
  create,
  addUser,
  removeUser,
  resendInvitation,
};
