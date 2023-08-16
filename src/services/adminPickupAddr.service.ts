import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import { CountryDocLean } from "../models/country.model";
import PickupAddrModel, { PickupAddrDocLean } from "../models/pickUpAddr.model";

// eslint-disable-next-line
const debug = Debug("project:adminStoreAddr.service");

const add = [
  shopIdMw,
  body("addr.en").optional().isString().withMessage("Invalid addr en"),
  body("addr.zhHant").optional().isString().withMessage("Invalid addr zhHant"),
  body("addr.zhHans").optional().isString().withMessage("Invalid addr zhHans"),
  body("tel").optional().isString().withMessage("Invalid tel"),
  body("openingHour.en").optional().isString().withMessage("Invalid openingHour en"),
  body("openingHour.zhHant").optional().isString().withMessage("Invalid openingHour zhHant"),
  body("openingHour.zhHans").optional().isString().withMessage("Invalid openingHour zhHans"),
  body("countryId").isMongoId().exists().withMessage("Invalid countryId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await PickupAddrModel.create({
        shop_id: req.shop._id,
        tel: req.data.tel,
        addr: req.data.addr,
        opening_hour: req.data.openingHour,
        country_id: req.data.countryId,
      });

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const get = [
  shopIdMw,
  localeMw,
  query("id").isMongoId().withMessage("Invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const pickupAddr = await PickupAddrModel.findOne({
        shop_id: req.shop._id,
        _id: req.data.id,
      })
        .populate("country_id")
        .lean();

      res.json(resPickupAddr(pickupAddr, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

const update = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  body("addr.en").optional().isString().withMessage("Invalid addr en"),
  body("addr.zhHant").optional().isString().withMessage("Invalid addr zhHant"),
  body("addr.zhHans").optional().isString().withMessage("Invalid addr zhHans"),
  body("tel").optional().isString().withMessage("Invalid tel"),
  body("openingHour.en").optional().isString().withMessage("Invalid openingHour en"),
  body("openingHour.zhHant").optional().isString().withMessage("Invalid openingHour zhHant"),
  body("openingHour.zhHans").optional().isString().withMessage("Invalid openingHour zhHans"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await PickupAddrModel.updateOne(
        {
          shop_id: req.shop._id,
          _id: req.data.id,
        },
        {
          $set: {
            addr: req.data.addr,
            tel: req.data.tel,
            opening_hour: req.data.openingHour,
          },
        }
      );

      res.json({ message: "updated" });
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
      const pickupAddrs = await PickupAddrModel.find({
        shop_id: req.shop._id,
      })
        .populate("country_id")
        .lean();

      res.json(pickupAddrs.map((p) => resPickupAddr(p, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resPickupAddr(pickupAddr: PickupAddrDocLean, locale: string) {
  return {
    id: pickupAddr._id,
    addr: pickupAddr.addr,
    tel: pickupAddr.tel,
    openingHour: pickupAddr.opening_hour,
    countryId: pickupAddr.country_id._id,
    country: localeCore.getDefaultLocaleText(locale, (pickupAddr.country_id as CountryDocLean).name),
  };
}

const deleteRecord = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const rst = await PickupAddrModel.deleteOne({
        shop_id: req.shop._id,
        _id: req.body.id,
      });

      if (rst.deletedCount === 1) {
        res.json({ message: "deleted" });
        return;
      }

      res.status(400).json({ message: "notFound" });
    } catch (e) {
      next(e);
    }
  },
];

export default {
  add,
  get,
  update,
  list,
  deleteRecord,
};
