import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";

import localeCore from "../core/locale.core";
import frontAuthMw from "../middleware/frontAuth.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CountryModel, { CountryDocLean } from "../models/country.model";
import HkRegionModel, { HkRegionDocLean } from "../models/hkRegion.model";
import PickupAddrModel, { PickupAddrDocLean, PickupAddrPoJo } from "../models/pickUpAddr.model";
import SfLocationModel, { SfLocationDocLean } from "../models/sfLocation.model";
import { ShipAddrDocLean, ShipAddrPoJo } from "../models/shipAddr.model";
import ShipSettingModel, { ShipSettingDocLean } from "../models/shipSetting.model";
import UserModel, { UserDocLean } from "../models/user.model";

// eslint-disable-next-line
const debug = Debug("project:shipAddr.service");

const shipAddrValidators = [
  body("recipientName").exists().withMessage("Missing recipientName"),
  body("telCountryCode").exists().withMessage("Missing telCountryCode"),
  body("tel").exists().withMessage("Missing tel"),
  body("countryCode").exists().withMessage("Missing country"),
  body("subDistrictId").if(body("countryCode").equals("852")).isMongoId().exists().withMessage("Missing subDistrictId"),
  body("address").exists().withMessage("Missing address"),
  body("state").optional(),
  body("city").optional(),
  body("zipCode").optional(),
  body("isDefault").optional().isBoolean().withMessage("invalid default"),
];

const addAddress = [
  shopIdMw,
  localeMw,
  frontAuthMw,
  ...shipAddrValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // const id = new mongoose.Types.ObjectId();

      const docData = await convertInputToModel(req.data, req.locale);

      // debug("addAddr data", docData);
      const updatedUser = await UserModel.findOneAndUpdate(
        {
          shop_id: req.shop._id,
          _id: req.frontUser._id,
        },
        {
          $push: {
            ship_addrs: docData,
          },
        },
        {
          new: true,
        }
      );

      if (updatedUser) {
        const id = updatedUser.ship_addrs[updatedUser.ship_addrs.length - 1]._id;
        const shipAddr = await updateDefaultAddr(id, true, req);
        return res.json(shipAddr);
      }

      if (!updatedUser) {
        return res.status(401).json({ message: "noRecordFound" });
      }

      // console.error("addAddress Failed", rst);
      // res.status(500).json({ message: "unknownError" });
    } catch (e) {
      next(e);
    }
  },
];

const updateAddress = [
  shopIdMw,
  localeMw,
  frontAuthMw,
  query("id").isMongoId().exists().withMessage("Missing Id"),
  ...shipAddrValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const rst = await UserModel.updateOne(
        {
          shop_id: req.shop._id,
          _id: req.frontUser._id,
          "ship_addrs._id": req.data.id,
        },
        {
          $set: {
            "ship_addrs.$": {
              ...(await convertInputToModel(req.data, req.locale)),
              // the id will be changed if we don't add it to keep it the same
              // that's how Mongo works.  Basically, this whole item in array, including the _id, will be updated
              _id: req.data.id,
            },
          },
        }
      );

      if (rst.modifiedCount === 1) {
        const shipAddr = await updateDefaultAddr(req.data.id, req.data.isDefault, req);
        return res.json(shipAddr);
      }

      if (rst.modifiedCount === 0) {
        return res.status(401).json({ message: "noRecordFound" });
      }

      console.error("addAddress Failed", rst);
      res.status(500).json({ message: "unknownError" });
    } catch (e) {
      next(e);
    }
  },
];

const deleteAddress = [
  shopIdMw,
  frontAuthMw,
  query("id").isMongoId().exists().withMessage("Missing Id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const rst = await UserModel.findOneAndUpdate(
        {
          shop_id: req.shop._id,
          _id: req.frontUser._id,
        },
        { $pull: { ship_addrs: { _id: req.data.id } } },
        { new: true, rawResult: true }
      );

      if (rst.lastErrorObject.updatedExisting) {
        await updateDefaultDeleted(req.shop._id, rst.value);
        return res.json({ message: "updated" });
      }

      res.status(500).json({ message: "unknownError" });
    } catch (e) {
      next(e);
    }
  },
];

async function convertInputToModel(body: any, locale: string): Promise<Omit<ShipAddrPoJo, "created_at">> {
  const data: Omit<ShipAddrPoJo, "created_at"> = {
    addr_type: "regular",
    recipient_name: body.recipientName,
    tel_country_code: body.telCountryCode,
    tel: body.tel,
    country_code: body.countryCode,
    address: body.address,
    state: body.state,
    city: body.city,
    zip_code: body.zipCode,
    is_default: body.isDefault,
  };

  if (body.subDistrictId) {
    const foundSubDistrict = await HkRegionModel.findById(body.subDistrictId).lean();

    data.region = localeCore.getDefaultLocaleText(locale, foundSubDistrict.region);
    data.district = localeCore.getDefaultLocaleText(locale, foundSubDistrict.district);
    data.subDistrict = localeCore.getDefaultLocaleText(locale, foundSubDistrict.sub_district);
    data.sub_district_id = foundSubDistrict._id;
  }

  return data;
}

async function updateDefaultAddr(id: mongoose.Types.ObjectId, isDefault: boolean, req: express.Request) {
  const user = await UserModel.findOne({ shop_id: req.shop._id, _id: req.frontUser._id });
  let updatedUser: any;

  if (isDefault) {
    updatedUser = await UserModel.updateOne(
      {
        shop_id: req.shop._id,
        _id: req.frontUser._id,
      },
      { $set: { "ship_addrs.$[elem].is_default": false } },
      { new: true, rawResult: true, arrayFilters: [{ "elem._id": { $ne: id } }] }
    );
  }

  const countries = await getCountries(user);
  const result = updatedUser?.lastErrorObject?.updatedExisting ? updatedUser.value : user;
  const addr = result.ship_addrs.find((s: ShipAddrDocLean) => s._id.toString() === id.toString());
  return resShipAddr(addr, countries, req.locale);
}

async function updateDefaultDeleted(shopId: string, updatedUser: UserDocLean) {
  //   check if the deleted field is the default address and set the first address to the new default
  if (updatedUser.ship_addrs.length > 0) {
    await UserModel.updateOne(
      {
        shop_id: shopId,
        _id: updatedUser._id,
        "ship_addrs.is_default": { $ne: true },
      },
      { $set: { "ship_addrs.0.is_default": true } }
    );
  }
}

const getAddrs = [
  shopIdMw,
  localeMw,
  frontAuthMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await UserModel.findOne({
        shop_id: req.shop._id,
        _id: req.frontUser._id,
      })
        .select("ship_addrs")
        .lean();

      const countries = await getCountries(user);

      res.json(user.ship_addrs.map((addr) => resShipAddr(addr, countries, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

async function getCountries(user: UserDocLean) {
  const countryCodes = Array.from(new Set(user.ship_addrs.map((addr) => addr.country_code)));

  return await CountryModel.find({
    country_codes: { $in: countryCodes },
  })
    .select("code name")
    .lean();
}

function resShipAddr(shipAddr: ShipAddrDocLean, countries: CountryDocLean[], locale: string) {
  return {
    id: shipAddr._id,
    addrType: shipAddr.addr_type,
    recipientName: shipAddr.recipient_name,
    telCountryCode: shipAddr.tel_country_code,
    tel: shipAddr.tel,
    countryCode: shipAddr.country_code,
    countryName: localeCore.getDefaultLocaleText(locale, countries.find((c) => c.code === shipAddr.country_code).name),
    region: shipAddr.region,
    district: shipAddr.district,
    subDistrict: shipAddr.subDistrict,
    subDistrictId: shipAddr.sub_district_id,
    address: shipAddr.address,
    state: shipAddr.state,
    zipCode: shipAddr.zip_code,
    city: shipAddr.city,
    isDefault: shipAddr.is_default,
  };
}

const getSfSubDistricts = [
  shopIdMw,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const districts = await SfLocationModel.distinct("sub_district");

      const regions = await HkRegionModel.find({
        "sub_district.zhHant": { $in: districts },
      });

      res.json(regions.map((r) => resRegion(r, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resRegion(region: HkRegionDocLean, locale: string) {
  return {
    key: region.sub_district.zhHant, // use to lookup locations by subdistricts
    region: localeCore.getDefaultLocaleText(locale, region.region),
    district: localeCore.getDefaultLocaleText(locale, region.district),
    subDistrict: localeCore.getDefaultLocaleText(locale, region.sub_district),
  };
}

const getSfLocations = [
  shopIdMw,
  localeMw,
  query("subDistrict").exists(),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const locations = await SfLocationModel.find({ sub_district: req.data.subDistrict }).lean();

      res.json(locations.map((l) => resLocation(l, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resLocation(location: SfLocationDocLean, locale: string) {
  return {
    code: location.code,
    address: localeCore.getDefaultLocaleText(locale, location.address),
    servicePartner: location.service_partner,
    shippingMethod: location.shipping_method,
    isHot: location.is_hot,
    hoursMonFri: location.hours_monfri,
    hoursSatSun: location.hours_satsun,
  };
}

const getSfLocation = [
  shopIdMw,
  localeMw,
  query("code").exists(),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const location = await SfLocationModel.findOne({ code: req.data.code }).lean();

      res.json(resLocation(location, req.locale));
    } catch (e) {
      next(e);
    }
  },
];

const getPickupAddrs = [
  shopIdMw,
  localeMw,
  query("countryId").optional().isMongoId().withMessage("Invalid countryId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const query: Partial<PickupAddrPoJo> = { shop_id: req.shop._id };

      if (req.data.countryId) {
        query.country_id = req.data.countryId;
      }

      const storeAddrs = await PickupAddrModel.find(query).lean();

      res.json(storeAddrs.map((s) => resStoreAddr(s, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resStoreAddr(storeAddr: PickupAddrDocLean, locale: string) {
  return {
    id: storeAddr._id,
    countryId: storeAddr.country_id,
    addr: localeCore.getDefaultLocaleText(locale, storeAddr.addr),
    tel: storeAddr.tel,
    openingHour: localeCore.getDefaultLocaleText(locale, storeAddr.opening_hour),
  };
}

const getShipSettings = [
  shopIdMw,
  localeMw,
  query("countryId").isMongoId().withMessage("Invalid countryId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shipSettings = await ShipSettingModel.find({
        shopId: req.shop._id,
        countryIds: { $in: [req.data.countryId] },
      }).lean();

      res.json(shipSettings.map((s) => resShipSetting(s, req.locale)));
    } catch (e) {
      next(e);
    }
  },
];

function resShipSetting(shipSetting: ShipSettingDocLean, locale: string) {
  return {
    id: shipSetting.id,
    countryIds: shipSetting.countryIds,
    options: shipSetting.options.map((option) => {
      return {
        id: option._id,
        shipType: option.shipType,
        name: option.name,
        feeOptions: option.feeOptions.map((feeOption) => {
          return {
            name: localeCore.getDefaultLocaleText(locale, feeOption.name),
            feeType: feeOption.feeType,
            setting: feeOption.setting,
          };
        }),
      };
    }),
  };
}

export default {
  addAddress,
  updateAddress,
  deleteAddress,
  getAddrs,
  getSfSubDistricts,
  getSfLocations,
  getSfLocation,
  getPickupAddrs,
  getShipSettings,
};
