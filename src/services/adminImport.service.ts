import Debug from "debug";
import express from "express";
import { FullShopData } from "fullShopData";
import mongoose from "mongoose";
import multer from "multer";

import mediaCore from "../core/media.core";
import isSuperAdmin from "../middleware/isSuperAdmin.mw";
import AttributeModel from "../models/attribute.model";
import CategoryModel from "../models/category.model";
import CountryModel, { CountryDocLean } from "../models/country.model";
import CouponModel from "../models/coupon.model";
import DiscountGroupModel from "../models/discountGroup.model";
import FormDefModel from "../models/formDef.model";
import MailTemplateModel from "../models/mailTemplate.model";
import MediaModel from "../models/media.model";
import PaySettingModel from "../models/paySetting.model";
import PickupAddrModel from "../models/pickUpAddr.model";
import ProductModel from "../models/product.model";
import ShipSettingModel, { ShipSettingDocLean } from "../models/shipSetting.model";
import ShopModel from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:adminImport.service");

interface ImportStatus {
  shopCode?: string;
  cats?: number;
  catCount?: number;
  attributeCount?: number;
  couponCount?: number;
  discountGroupCount?: number;
  formDefsount?: number;
  mailTemplateCount?: number;
  paySettingCount?: number;
  pickUpAddrCount?: number;
  shipSettingCount?: number;
  productCount?: number;
  mediaCount?: number;
}

const importJsonUpload = multer({
  storage: multer.memoryStorage(),
});

const importFullShop = [
  isSuperAdmin,
  importJsonUpload.single("file"),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const file = req.file;
      const content = file.buffer.toString();

      const data = JSON.parse(content) as FullShopData;

      await removeExisingShop(data);
      const rst = await performImport(data, req.adminUser._id);

      res.json(rst);
    } catch (e) {
      next(e);
    }
  },
];

async function removeExisingShop(data: FullShopData) {
  await ShopModel.remove({ _id: data.shop._id });
  await AttributeModel.remove({ shop_id: data.shop._id });
  await CategoryModel.remove({ shop_id: data.shop._id });
  await CouponModel.remove({ shopId: data.shop._id });
  await DiscountGroupModel.remove({ shopId: data.shop._id });
  await FormDefModel.remove({ shopId: data.shop._id });
  await MailTemplateModel.remove({ shopId: data.shop._id });
  await PaySettingModel.remove({ shopId: data.shop._id });
  await PickupAddrModel.remove({ shop_id: data.shop._id });
  await ShipSettingModel.remove({ shopId: data.shop._id });
  await ProductModel.remove({ shop_id: data.shop._id });
  await MediaModel.remove({ shopId: data.shop._id });
}

async function performImport(data: FullShopData, adminUserId: mongoose.Types.ObjectId) {
  const rst: ImportStatus = {};

  // remove users from other environments
  data.shop.users = [];

  //   debug("shop", data.shop);
  await ShopModel.create(data.shop);
  rst.shopCode = data.shop.code;

  await ShopModel.findOneAndUpdate(
    {
      _id: data.shop._id,
    },
    {
      $push: {
        users: {
          admin_user_id: adminUserId,
          type: "admin",
        },
      },
    }
  );

  await CategoryModel.insertMany(data.categories);
  rst.catCount = data.categories.length;

  await AttributeModel.insertMany(data.attributes);
  rst.attributeCount = data.attributes.length;

  await CouponModel.insertMany(data.coupons);
  rst.couponCount = data.coupons.length;

  await DiscountGroupModel.insertMany(data.discountGroups);
  rst.discountGroupCount = data.discountGroups.length;

  await FormDefModel.insertMany(data.formDefs);
  rst.formDefsount = data.formDefs.length;

  await MailTemplateModel.insertMany(data.mailTemplates);
  rst.mailTemplateCount = data.mailTemplates.length;

  await PaySettingModel.insertMany(data.paySettings);
  rst.paySettingCount = data.paySettings.length;

  await PickupAddrModel.insertMany(data.pickupAddrs);
  rst.pickUpAddrCount = data.pickupAddrs.length;

  await importShipSettings(data.shipSettings);
  rst.shipSettingCount = data.shipSettings.length;

  await ProductModel.insertMany(data.products);
  rst.productCount = data.products.length;

  const uploadedMediaList = data.mediaList.map((media) => mediaCore.changeMediaUrl(data.shop, media));
  await MediaModel.insertMany(uploadedMediaList);
  rst.mediaCount = uploadedMediaList.length;

  return rst;
}

async function importShipSettings(shipSettings: ShipSettingDocLean[]) {
  for (const shipSetting of shipSettings) {
    shipSetting.countryIds = await Promise.all(
      (shipSetting.countryIds as CountryDocLean[]).map(async (country) => {
        const countryRecord = await CountryModel.findOne({ iso: country.iso }).lean();
        return countryRecord._id as mongoose.Types.ObjectId;
      })
    );
  }

  await ShipSettingModel.insertMany(shipSettings);
}

export default { importFullShop };
