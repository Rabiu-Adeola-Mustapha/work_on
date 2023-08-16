import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import { CountryDocLean } from "../models/country.model";
import PaySettingModel, { PaySettingDocLean } from "../models/paySetting.model";

// eslint-disable-next-line
const debug = Debug("project:adminPaySetting.service");

const add = [
  shopIdMw,
  body("payType").isIn(["cod", "paypal", "stripe"]).withMessage("Invalid payType"),
  body("name.en").optional().isString().withMessage("Invalid name en"),
  body("name.zhHant").optional().isString().withMessage("Invalid name zhHant"),
  body("name.zhHans").optional().isString().withMessage("Invalid name zhHans"),
  body("countryIds").isArray({ min: 1 }).optional().withMessage("Invalid countryIds"),
  body("shipTypes").isArray({ min: 1 }).optional().withMessage("invalid shipTypes"),
  body("setting").isObject().withMessage("invalid setting"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await PaySettingModel.create({
        shopId: req.shop._id,
        name: req.data.name,
        payType: req.data.payType,
        shipTypes: req.data.shipTypes,
        countryIds: req.data.countryIds,
        setting: req.data.setting,
      });

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const list = [
  shopIdMw,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const paySettings = await PaySettingModel.find({ shopId: req.shop._id }) //
        .populate("countryIds")
        .lean();

      res.json(paySettings.map((p) => resPaySetting(p, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resPaySetting(paySetting: PaySettingDocLean, locale: string) {
  return {
    id: paySetting._id,
    name: paySetting.name,
    shopId: paySetting.shopId,
    payType: paySetting.payType,
    shipTypes: paySetting.shipTypes,
    countryList: paySetting.countryIds.map((c) => resCountry(c as CountryDocLean, locale)),
    setting: paySetting.setting,
  };
}

function resCountry(country: CountryDocLean, locale: string) {
  return {
    id: country._id,
    code: country.code,
    name: localeCore.getDefaultLocaleText(locale, country.name),
    iso: country.iso,
  };
}

const deleteRecord = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const status = await PaySettingModel.deleteOne({
        shopId: req.shop._id,
        _id: req.data.id,
      });

      if (status.deletedCount === 1) {
        return res.json({ message: "deleted" });
      }

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

const single = [
  shopIdMw,
  localeMw,
  query("id").isMongoId().withMessage("invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const paySetting = await PaySettingModel.findOne({
        shopId: req.shop._id,
        _id: req.data.id,
      })
        .populate("countryIds")
        .lean();

      res.json(resPaySetting(paySetting, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

const updateRecord = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  body("name.en").optional().isString().withMessage("Invalid name en"),
  body("name.zhHant").optional().isString().withMessage("Invalid name zhHant"),
  body("name.zhHans").optional().isString().withMessage("Invalid name zhHans"),
  body("payType").isIn(["cod", "paypal", "stripe"]).withMessage("Invalid payType"),
  body("countryIds").isArray({ min: 1 }).optional().withMessage("Invalid countryIds"),
  body("shipTypes").isArray({ min: 1 }).optional().withMessage("invalid shipTypes"),
  body("setting").isObject().withMessage("invalid setting"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const status = await PaySettingModel.updateOne(
        {
          shopId: req.shop._id,
          _id: req.data.id,
        },
        {
          $set: {
            name: req.data.name,
            payType: req.data.payType,
            shipTypes: req.data.shipTypes,
            countryIds: req.data.countryIds,
            setting: req.data.setting,
          },
        }
      );

      if (status.modifiedCount === 1) {
        return res.json({ message: "updated" });
      }

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

export default {
  add,
  list,
  deleteRecord,
  single,
  updateRecord,
};
