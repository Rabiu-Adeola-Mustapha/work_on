import Debug from "debug";
import express from "express";
import { query } from "express-validator";
import mongoose, { FilterQuery } from "mongoose";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CategoryModel, { CategoryDoc, CategoryDocLean } from "../models/category.model";

// eslint-disable-next-line
const debug = Debug("project:category.service");

const list = [
  shopIdMw,
  localeMw,
  query("deep").isNumeric().optional().withMessage("invalid deep"),
  query("codes").isArray().optional().withMessage("invalid codes"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      if (req.data.deep === undefined) {
        req.data.deep = 0;
      }

      const filter: FilterQuery<CategoryDoc> = {
        $and: [
          { shop_id: req.shop._id }, //
          { $or: [{ parent_id: { $exists: false } }, { parent_id: null }] },
        ],
      };

      if (req.data.codes) {
        filter.code = { $in: req.data.codes };
      }

      const cats = await CategoryModel.find(filter).lean();

      const list = [];

      for (const cat of cats) {
        list.push(await populateCat(cat, req.data.deep, req.locale));
      }

      res.json(list);
    } catch (e) {
      next(e);
    }
  },
];

interface CatItem {
  id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  parentId: mongoose.Types.ObjectId;
  code: string;
  children?: CatItem[];
}

async function populateCat(cat: CategoryDocLean, deep: number, locale: string): Promise<CatItem> {
  const res = resCategory(cat, locale);

  if (deep <= 0) return res;

  const childCats = await CategoryModel.find({
    parent_id: cat._id,
  }).lean();

  const children = await Promise.all(childCats.map((childCat) => populateCat(childCat, deep - 1, locale)));

  return {
    ...resCategory(cat, locale),
    children,
  };
}

export function resCategory(cat: CategoryDocLean, locale: string) {
  return {
    id: cat._id,
    name: localeCore.getDefaultLocaleText(locale, cat.name),
    slug: localeCore.getDefaultLocaleText(locale, cat.slug),
    parentId: cat.parent_id as mongoose.Types.ObjectId,
    code: cat.code,
  };
}

export default {
  list,
};
