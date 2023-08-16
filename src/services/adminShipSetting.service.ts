import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import { FeeSettingFlat, FeeSettingFree } from "shippingSetting";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CountryModel, { CountryDocLean } from "../models/country.model";
import HkRegionModel, { HkRegionDocLean } from "../models/hkRegion.model";
import ShipSettingModel, {
  FeeOptionDocLean,
  ShipSettingDocLean,
  ShipSettingOptionDocLean,
} from "../models/shipSetting.model";

// eslint-disable-next-line
const debug = Debug("project:adminShipSetting.service");

const shipSettingValidator = [
  body("countryIds").isArray({ min: 1 }).withMessage("Invalid countryIds"),
  body("options").isArray({ min: 1 }).withMessage("Invalid options"),
  body("hkSubDistrictCharges").isArray({ min: 1 }).optional().withMessage("Invalid hkSubDistrictCharges"),
  body("options.*.hkSubDistrictCharges.*.hkRegionId").isMongoId().withMessage("Invalid hkSubDistrictCharges.*.charge"),
  body("options.*.hkSubDistrictCharges.*.charge").isNumeric().withMessage("Invalid hkSubDistrictCharges.*.charge"),
  body("options.*.feeOptions.*.excludeHkSubDistrictCharge")
    .isBoolean()
    .optional()
    .withMessage("Invalid options.*.feeOptions.*.excludeHkSubDistrictCharge"),
];

const add = [
  shopIdMw,
  ...shipSettingValidator,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shipSetting = sanitizeShipSetting(req.data);

      const doc = await ShipSettingModel.create({
        shopId: req.shop._id,
        ...shipSetting,
      });

      res.json({ id: doc._id });
    } catch (e) {
      next(e);
    }
  },
];

const updateRecord = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  ...shipSettingValidator,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const status = await ShipSettingModel.updateOne(
        {
          shopId: req.shop._id,
          _id: req.data.id,
        },
        {
          $set: {
            countryIds: req.data.countryIds,
            options: req.data.options,
            hkSubDistrictCharges: req.data.hkSubDistrictCharges,
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

const list = [
  shopIdMw,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shipSettings = await ShipSettingModel.find({
        shopId: req.shop._id,
      })
        .populate(["countryIds", "options.hkSubDistrictCharges.hkRegionId"])
        .lean();

      res.json(shipSettings.map((s) => resShipSetting(s, req.locale)));
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
      const shipSetting = await ShipSettingModel.findOne({
        shopId: req.shop._id,
        _id: req.data.id,
      })
        .populate("countryIds")
        .lean();

      res.json(resShipSetting(shipSetting, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

function resShipSetting(shipSetting: ShipSettingDocLean, locale: string) {
  const obj = {
    id: shipSetting._id,
    countryList: (shipSetting.countryIds as CountryDocLean[]).map((c) => {
      return {
        id: c._id,
        name: localeCore.getDefaultLocaleText(locale, c.name),
      };
    }),
    options: shipSetting.options.map((option) => resShipOption(option, locale)),
  };

  return obj;
}

function resShipOption(shipOption: ShipSettingOptionDocLean, locale: string) {
  return {
    shipType: shipOption.shipType,
    name: shipOption.name,
    feeOptions: shipOption.feeOptions.map((feeOption) => resFeeOption(feeOption, locale)),
    hkSubDistrictCharges: shipOption.hkSubDistrictCharges?.map((record) => {
      return {
        ...resHkSubDistrict(record.hkRegionId as HkRegionDocLean, locale),
        charge: record.charge,
      };
    }),
  };
}

function resFeeOption(feeOption: FeeOptionDocLean, locale: string) {
  return {
    name: feeOption.name,
    feeType: feeOption.feeType,
    setting: feeOption.setting,
    excludeHkSubDistrictCharge: feeOption.excludeHkSubDistrictCharge,
  };
}

function resHkSubDistrict(region: HkRegionDocLean, locale: string) {
  return {
    hkRegionId: region._id,
    region: localeCore.getDefaultLocaleText(locale, region.region),
    district: localeCore.getDefaultLocaleText(locale, region.district),
    subDistrct: localeCore.getDefaultLocaleText(locale, region.sub_district),
  };
}

const deleteRecord = [
  shopIdMw,
  body("id").isMongoId().withMessage("Invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const status = await ShipSettingModel.deleteOne({
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

const getCountries = [
  shopIdMw,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const countries = await CountryModel.find() //
        .select("code iso name")
        .lean();

      res.json(countries.map((c) => resCountry(c, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resCountry(country: CountryDocLean, locale: string) {
  return {
    id: country._id,
    code: country.code,
    name: localeCore.getDefaultLocaleText(locale, country.name),
    iso: country.iso,
  };
}

function sanitizeShipSetting(data: any): Partial<ShipSettingDocLean> {
  return {
    countryIds: data.countryIds,
    options: data.options.map(sanitizeShipSettingOption),
  };
}

function sanitizeShipSettingOption(data: any): Partial<ShipSettingOptionDocLean> {
  return {
    shipType: data.shipType,
    name: data.name,
    feeOptions: data.feeOptions.map(sanitizeFeeOption),
    hkSubDistrictCharges: data.hkSubDistrictCharges,
  };
}

function sanitizeFeeOption(data: any): FeeOptionDocLean {
  return {
    name: data.name,
    feeType: data.feeType,
    setting: sanitizeFeeSetting(data),
    excludeHkSubDistrictCharge: data.excludeHkSubDistrictCharge,
  };
}

function sanitizeFeeSetting(data: any): FeeSettingFlat | FeeSettingFree {
  switch (data.feeType) {
    case "flat":
      return {
        flat: parseInt(data.setting.flat),
        amtAbove: parseInt(data.setting.amtAbove),
      };
    case "free":
      return {
        flat: parseInt(data.setting.flat),
        freeAmtAbove: parseInt(data.setting.freeAmtAbove),
      };
  }
}

const getHkSubdistricts = [
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      debug("getHkSubdistricts");
      const records = await HkRegionModel.find().lean();

      debug("getHkSubdistricts records");
      res.json(records.map((r) => resSubDistrict(r, req.locale)));
      debug("getHkSubdistricts done");
    } catch (e) {
      debug("error", e);
      next(e);
    }
  },
];

function resSubDistrict(record: HkRegionDocLean, locale: string) {
  return {
    id: record._id,
    region: localeCore.getDefaultLocaleText(locale, record.region),
    district: localeCore.getDefaultLocaleText(locale, record.district),
    subDistrict: localeCore.getDefaultLocaleText(locale, record.sub_district),
  };
}

export default {
  getCountries,
  add,
  list,
  single,
  updateRecord,
  deleteRecord,
  getHkSubdistricts,
};
