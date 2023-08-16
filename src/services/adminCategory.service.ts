import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";
import mongoose from "mongoose";

import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CategoryModel, { CategoryDocLean } from "../models/category.model";
import { AvailableLocales, LocaleTextPoJo } from "../models/locale.model";

// eslint-disable-next-line
const debug = Debug("project:adminCategory.service");

const create = [
  shopIdMw,
  body("code").isString().withMessage("Invalid code"),
  body("name").isObject().exists().withMessage("Missing name"),
  body("slug").isObject().exists().withMessage("Missing slug"),
  body("parentId").optional().isMongoId().withMessage("Invalid parent id"),
  body("rewardPayout").isNumeric().optional().withMessage("Invalid rewardPayout"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const record = await CategoryModel.create({
        shop_id: req.shop._id,
        code: (req.data.code as string).toLowerCase(),
        name: req.data.name,
        slug: req.data.slug,
        created_by: req.adminUser._id,
        rewardPayout: req.body.rewardPayout,
        ...(req.data.parentId ? { parent_id: req.body.parentId } : {}),
      });

      return res.json(responseCategory(record));
    } catch (e) {
      next(e);
    }
  },
];

export function responseCategory(category: CategoryDocLean) {
  return {
    id: category._id,
    code: category.code,
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id,
    rewardPayout: category.rewardPayout,
  };
}

const list = [
  shopIdMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const list = await CategoryModel.find({ shop_id: req.shop._id }).lean();
      res.json(list.map(responseCategory));
    } catch (e) {
      next(e);
    }
  },
];

const edit = [
  shopIdMw,
  body("name").exists().withMessage("Missing name"),
  body("slug").exists().withMessage("Missing slug"),
  body("id").exists().isMongoId().withMessage("Invalid id"),
  body("parentId").optional().isMongoId().withMessage("Invalid parent id"),
  body("rewardPayout").isNumeric().optional().withMessage("Invalid rewardPayout"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await CategoryModel.findOneAndUpdate(
        {
          _id: req.data.id,
          shop_id: req.shop._id,
        },
        {
          $set: {
            name: req.data.name,
            slug: req.data.slug,
            parent_id: req.data.parentId === undefined ? null : req.data.parentId,
            rewardPayout: req.data.rewardPayout,
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
  query("id").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const record = await CategoryModel.findOne({
        _id: req.data.id,
        shop_id: req.shop._id,
      }).lean();

      res.json(responseCategory(record));
    } catch (e) {
      next(e);
    }
  },
];

export interface CatImport {
  code: string;
  [key: `name${string}`]: string;
  [key: `slug${string}`]: string;
  parentCode?: string;
  rewardPayout?: number;
}

const importCats = [
  shopIdMw,
  body("cats").isArray().withMessage("invalid cats"),
  body("cats.*.code").isString().withMessage("invalid code in cats array"),
  body("cats.*.name.en").isString().optional().withMessage("invalid nameEn in cats array"),
  body("cats.*.name.zhHant").isString().optional().withMessage("invalid nameZhant in cats array"),
  body("cats.*.name.zhHans").isString().optional().withMessage("invalid nameZhans in cats array"),
  body("cats.*.slug.en").isString().optional().withMessage("invalid slugEn in cats array"),
  body("cats.*.slug.zhHant").isString().optional().withMessage("invalid slugZhant in cats array"),
  body("cats.*.slug.zhHans").isString().optional().withMessage("invalid slugZhans in cats array"),
  body("cats.*.parentCode").isString().optional().withMessage("invalid parentCode in cats array"),
  body("cats.*.rewardPayout").isNumeric().optional().withMessage("invalid rewardPayout in cats array"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const cats = req.data.cats as CatImport[];

      const rstList = [];

      for (const cat of cats) {
        rstList.push(await importCat(cat, req));
      }

      res.json(rstList);
    } catch (e) {
      next(e);
    }
  },
];

async function getCatIdByCode(shopId: mongoose.Types.ObjectId, code: string) {
  const record = await CategoryModel.findOne({ shop_id: shopId, code }).lean();

  if (!record) return undefined;
  return record._id;
}

async function importCat(cat: CatImport, req: express.Request) {
  try {
    const newCat = await CategoryModel.create({
      shop_id: req.shop._id,
      code: cat.code,
      name: getLocaleText(cat, /name.(.+)/),
      slug: getLocaleText(cat, /slug.(.+)/),
      rewardPayout: cat.rewardPayout ?? undefined,
      parent_id: cat.parentCode ? await getCatIdByCode(req.shop._id, cat.parentCode) : undefined,
    });

    return {
      code: cat.code,
      id: newCat._id,
      success: true,
    };
  } catch (e) {
    console.error(e);
    return {
      code: cat.code,
      success: false,
      error: e.toString(),
    };
  }
}

function getLocaleText(catImport: CatImport, prefixRegex: RegExp): LocaleTextPoJo {
  const matchingPrefixKeys = Object.entries(catImport).filter(([key]) => prefixRegex.test(key));

  const localeEntries = matchingPrefixKeys
    .map(([key, value]) => {
      const [, locale] = key.match(prefixRegex);
      return [locale, value];
    })
    .filter(([locale]) => AvailableLocales.includes(locale));

  if (localeEntries.length === 0) return undefined;

  return localeEntries.reduce((prev: any, [locale, value]) => {
    prev[locale] = value;
    return prev;
  }, {});
}

export default {
  create,
  list,
  edit,
  getOne,
  importCats,
};
