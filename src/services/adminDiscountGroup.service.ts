import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import { CategoryDocLean } from "../models/category.model";
import DiscountGroupModel, {
  DiscountGroupDocLean,
  DiscountProductDocLean,
  DiscountProductPoJo,
} from "../models/discountGroup.model";
import { ProductDocLean } from "../models/product.model";
import ShopModel from "../models/shop.model";
import { responseCategory } from "./adminCategory.service";
import { responseProduct } from "./adminProduct.service";

// eslint-disable-next-line
const debug = Debug("project:adminDiscountGroup.service");

function arrayHasValue(field: any) {
  if (field === undefined) return false;
  if (field === null) return false;
  if (field.length === 0) return false;

  return true;
}

function validateDiscountProducts(discountProducts: DiscountProductPoJo[]) {
  // ensure discountPrice is valid when type is "fixed" and discountPercentage is type is "percentage"
  for (const p of discountProducts) {
    if (p.discountType === "fixed" && !p.discountPrice) return false;
    if (p.discountType === "percentage" && p.discountPercentage > 100) return false;
  }
  return true;
}

const createValidators = [
  body("name").isString().withMessage("invalid name"),
  body("productsScope").isString().withMessage("invalid productsScope"),
  body("placement").isString().withMessage("invalid placement"),
  body("attachToCatIds")
    .custom((value, { req }) => {
      if (arrayHasValue(req.body.attachToProductIds) && arrayHasValue(value)) return false;
      if (!arrayHasValue(req.body.attachToProductIds) && !arrayHasValue(value)) return false;
      return true;
    })
    .withMessage("attachToCatIds and attachToProductIds can exists either one"),
  body("attachToCatIds").optional().isArray().withMessage("invalid attachToCatIds"),
  body("attachToProductIds")
    .custom((value, { req }) => {
      if (arrayHasValue(req.body.attachToCatIds) && arrayHasValue(value)) return false;
      if (!arrayHasValue(req.body.attachToCatIds) && !arrayHasValue(value)) return false;
      return true;
    })
    .withMessage("attachToCats and attachToProductIds can exists either one"),
  body("attachToProductIds").optional().isArray().withMessage("invalid attachToProductIds"),
  body("discountProducts.*.productId").isMongoId().withMessage("invalid discountProducts.*.productId"),
  body("discountProducts.*.discountType")
    .isIn(["percentage", "fixed"])
    .withMessage("invalid discountProducts.*.discountType"),
  body("discountProducts.*.discountPrice")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("invalid discountProducts.*.discountPrice"),
  body("discountProducts.*.discountPercentage")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("invalid discountProducts.*.discountPercentage"),
  //  ensure discount productType and expected value matches.
  body("discountProducts")
    .custom((_, { req }) => validateDiscountProducts(req.body.discountProducts))
    .withMessage("discountProducts missing a product discount price or percentage"),
];

const create = [
  shopIdMw,
  ...createValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const discountProducts = getDiscountProducts(req.data.discountProducts);

      const discountGroup = await DiscountGroupModel.create({
        shopId: req.shop._id,
        ...req.data,
        discountProducts,
      });

      res.json(discountGroup);
    } catch (e) {
      next(e);
    }
  },
];

const list = [
  shopIdMw,
  localeMw,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();

      const discountGroups = await DiscountGroupModel.find({ shopId: req.shop._id })
        .populate("attachToCatIds")
        .populate("attachToProductIds")
        .populate("discountProducts.productId")
        .lean();

      res.json(discountGroups.map((g) => resGroup(g, req.locale, shop.product_prefix)));
    } catch (e) {
      next(e);
    }
  },
];

function getDiscountProducts(discountProducts: DiscountProductPoJo[]) {
  return discountProducts.map((p) => {
    switch (p.discountType) {
      case "fixed":
        return { ...p, discountPercentage: null };
      case "percentage":
        return { ...p, discountPrice: null };
      default:
        throw new Error("invalid discount type");
    }
  });
}

function resGroup(group: DiscountGroupDocLean, locale: string, productPrefix: string) {
  return {
    id: group._id,
    name: group.name,
    placement: group.placement,
    productsScope: group.productsScope,
    attachToCats: group.attachToCatIds
      ? group.attachToCatIds.map((c) => responseCategory(c as CategoryDocLean))
      : undefined,
    attachToProducts: group.attachToProductIds
      ? group.attachToProductIds.map((p) => responseProduct(p as ProductDocLean, locale, productPrefix))
      : undefined,
    discountProducts: group.discountProducts
      ? group.discountProducts.map((p) => resDiscountProduct(p as DiscountProductDocLean, locale, productPrefix))
      : undefined,
  };
}

function resDiscountProduct(discountProduct: DiscountProductDocLean, locale: string, productPrefix: string) {
  return {
    product: (discountProduct.productId as any).name
      ? responseProduct(discountProduct.productId as ProductDocLean, locale, productPrefix)
      : undefined,
    discountPrice: discountProduct.discountPrice,
  };
}

const edit = [
  shopIdMw,
  query("groupId").isMongoId().withMessage("invalid group id"),
  ...createValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const discountProducts = getDiscountProducts(req.data.discountProducts);

      await DiscountGroupModel.findOneAndUpdate(
        {
          _id: req.data.groupId,
          shopId: req.shop._id,
        },
        {
          $set: {
            name: req.data.name,
            placement: req.data.placement,
            productsScope: req.data.productsScope,
            attachToCats: req.data.attachToCats,
            attachToProducts: req.data.attachToProducts,
            discountProducts,
          },
        }
      );

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const getOne = [
  shopIdMw,
  query("groupId").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const record = await DiscountGroupModel.findOne({
        _id: req.data.groupId,
        shopId: req.shop._id,
      }).lean();

      res.json(record);
    } catch (e) {
      next(e);
    }
  },
];

export default { create, list, edit, getOne };
