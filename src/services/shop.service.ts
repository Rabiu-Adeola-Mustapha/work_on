import Debug from "debug";
import express from "express";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import CountryModel, { CountryDocLean } from "../models/country.model";
import HkRegionModel, { HkRegionDocLean } from "../models/hkRegion.model";
import ShipSettingModel from "../models/shipSetting.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:shop.service");

const get = [
  shopIdMw,
  localeMw,
  async (req: Express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id, ["locales", "name", "currencies", "default_currency"]).lean();
      res.json(resShop(shop, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

const getShippingCountries = [
  shopIdMw,
  localeMw,
  async (req: Express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shipSettings = await ShipSettingModel.find({ shopId: req.shop._id }, "countryIds").lean();

      const countryIds = shipSettings.map((s) => s.countryIds).flat();
      const countries = await CountryModel.find(
        {
          _id: { $in: countryIds },
          // code: { $in: ["86", "852"] },
          // "name.en": { $in: ["Hong Kong", "China"] },
        },
        "name code iso"
      ).lean();

      res.json(countries.map((c) => resCountry(c, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

const getHkRegions = [
  localeMw,
  async (req: Express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const regions = await HkRegionModel.find(null, "region district sub_district").lean();

      res.json(regions.map((r) => resHkRegion(r, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resShop(shop: ShopDocLean, locale: string) {
  return {
    name: localeCore.getDefaultLocaleText(locale, shop.name),
    locales: shop.locales,
    currencies: shop.currencies,
    defaultCurrency: shop.default_currency,
  };
}

function resCountry(country: CountryDocLean, locale: string) {
  return {
    id: country._id,
    name: localeCore.getDefaultLocaleText(locale, country.name),
    code: country.code,
    iso: country.iso,
  };
}

function resHkRegion(region: HkRegionDocLean, locale: string) {
  return {
    id: region._id,
    region: localeCore.getDefaultLocaleText(locale, region.region),
    district: localeCore.getDefaultLocaleText(locale, region.district),
    subDistrict: localeCore.getDefaultLocaleText(locale, region.sub_district),
  };
}

export default {
  get,
  getShippingCountries,
  getHkRegions,
};
