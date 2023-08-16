import fs from "fs/promises";

import express from "express";
import { query } from "express-validator";
import { FullShopData } from "fullShopData";
import tmp from "tmp";

import adminCookiesAuthMw from "../middleware/adminQueryAuth.mw";
import isShopAdminMw from "../middleware/isShopAdmin.tw";
import shopIdQueryMw from "../middleware/shopIdQuery.mw";
import { validateResult } from "../middleware/validator.mw";
import AttributeModel from "../models/attribute.model";
import CategoryModel from "../models/category.model";
import CouponModel from "../models/coupon.model";
import DiscountGroupModel from "../models/discountGroup.model";
import FormDefModel from "../models/formDef.model";
import MailTemplateModel from "../models/mailTemplate.model";
import MediaModel from "../models/media.model";
import PaySettingModel from "../models/paySetting.model";
import PickupAddrModel from "../models/pickUpAddr.model";
import ProductModel from "../models/product.model";
import ShipSettingModel from "../models/shipSetting.model";
import ShopModel from "../models/shop.model";

const exportFullShop = [
  adminCookiesAuthMw,
  shopIdQueryMw,
  isShopAdminMw,
  query("shopId").isMongoId().withMessage("invalid shopId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [
        shop,
        attributes,
        categories,
        coupons,
        discountGroups,
        formDefs,
        mailTemplates,
        paySettings,
        pickupAddrs,
        shipSettings,
        products,
        mediaList,
      ] = await Promise.all([
        ShopModel.findById(req.shop._id).lean(),
        AttributeModel.find({ shop_id: req.shop._id }).lean(),
        CategoryModel.find({ shop_id: req.shop._id }).lean(),
        CouponModel.find({ shopId: req.shop._id }).lean(),
        DiscountGroupModel.find({ shopId: req.shop._id }).lean(),
        FormDefModel.find({ shopId: req.shop._id }).lean(),
        MailTemplateModel.find({ shopId: req.shop._id }).lean(),
        PaySettingModel.find({ shopId: req.shop._id }).lean(),
        PickupAddrModel.find({ shop_id: req.shop._id }).lean(),
        ShipSettingModel.find({ shopId: req.shop._id }).populate("countryIds").lean(),
        ProductModel.find({ shop_id: req.shop._id }).lean(),
        MediaModel.find({ shopId: req.shop._id }).lean(),
      ]);

      const fileContent: FullShopData = {
        shop,
        attributes,
        categories,
        coupons,
        discountGroups,
        formDefs,
        mailTemplates,
        paySettings,
        pickupAddrs,
        shipSettings,
        products,
        mediaList,
      };

      const file = tmp.tmpNameSync();

      await fs.writeFile(file, JSON.stringify(fileContent));

      res.download(file, `fullShop-${shop.code}.json`, (err) => {
        console.error(err);

        fs.unlink(file).catch((reason) => {
          console.error(reason);
        });
      });
    } catch (e) {
      next(e);
    }
  },
];

export default { exportFullShop };
