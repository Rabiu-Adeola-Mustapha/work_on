// import Debug from "debug";
import express from "express";
import { query } from "express-validator";
import mongoose from "mongoose";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopId from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import PaySettingModel, {
  CodSetting,
  PaySettingDocLean,
  PaypalSetting,
  StripeSetting,
} from "../models/paySetting.model";

// const debug = Debug("project:pay.service");

const getOptions = [
  shopId,
  localeMw,
  query("countryId").isMongoId().withMessage("invalid countryId"),
  query("shipType").isString().withMessage("invalid shipType"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const paySettings = await PaySettingModel.find({
        shopId: req.shop._id,
        // countryIds: { $in: [req.data.countryId] },
        isActive: true,
      }).lean();

      function filterShipType(p: PaySettingDocLean) {
        if (p.shipTypes.length === 0) return true;
        return p.shipTypes.includes(req.data.shipType);
      }

      function filterCountryId(p: PaySettingDocLean) {
        if (p.countryIds.length === 0) return true;
        return (p.countryIds as mongoose.Types.ObjectId[]).some((c) => c.equals(req.data.countryId));
      }

      const list = paySettings //
        .filter(filterShipType)
        .filter(filterCountryId);

      res.json(list.map((p) => resPaySetting(p, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resPaySetting(paySetting: PaySettingDocLean, locale: string) {
  return {
    id: paySetting._id,
    name: localeCore.getDefaultLocaleText(locale, paySetting.name),
    payType: paySetting.payType,
    setting: resSetting(paySetting, locale),
  };
}

function resSetting(paySetting: PaySettingDocLean, locale: string) {
  switch (paySetting.payType) {
    case "cod":
      return resCodSetting(paySetting.setting as CodSetting, locale);
    case "paypal":
      return resPaypalSetting(paySetting.setting as PaypalSetting);
    case "stripe":
      return resStripeSetting(paySetting.setting as StripeSetting);
    default:
      return undefined;
  }
}

function resCodSetting(cod: CodSetting, locale: string) {
  return {
    paymentOnDelivery: cod.paymentOnDelivery,
    message: localeCore.getDefaultLocaleText(locale, cod.message),
    qrCode: cod.qrCode,
  };
}

function resPaypalSetting(paypal: PaypalSetting) {
  return { key: paypal.key };
}

function resStripeSetting(stripe: StripeSetting) {
  return { key: stripe.key };
}

export default {
  getOptions,
};
