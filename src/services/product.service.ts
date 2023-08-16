import Debug from "debug";
import express from "express";
import { body, param } from "express-validator";
import mongoose from "mongoose";

import currencyCore from "../core/currency.core";
import localeCore from "../core/locale.core";
import productCore from "../core/product.core";
import currencyMw from "../middleware/currency.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CategoryModel, { CategoryDoc, CategoryDocLean } from "../models/category.model";
import { LocaleOptionType } from "../models/locale.model";
import ProductModel, { ProductDoc, resProduct } from "../models/product.model";
import ShopModel from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:product.service");

interface ProductFilter {
  locale: LocaleOptionType;
  paging: {
    size: number;
    page: number;
  };
  cats?: {
    type: "and" | "or";
    ids: string[];
    slugs: string[];
  };
  price?: {
    min: number;
    max: number;
  };
  attrs: {
    type: "and" | "or";
    list: ProductFilterAttr[];
  };
  isPromotionProduct?: boolean;
  search: string;
}

interface ProductFilterAttr {
  attributeId: string;
  value: number | string;
}

const list = [
  shopIdMw,
  localeMw,
  currencyMw,
  body("paging.size").default(20).isNumeric().withMessage("Invalid size"),
  body("paging.page").default(1).isNumeric().withMessage("Invalid page"),
  body("cats.ids").isArray().optional().withMessage("Invalid cats ids"),
  body("cats.slugs").isArray().optional().withMessage("Invalid slugs"),
  body("cats.type").isIn(["and", "or"]).optional().withMessage("Invalid cats type"),
  body("price.min").isNumeric().optional().withMessage("Invalid min price"),
  body("price.max").isNumeric().optional().withMessage("Invalid max price"),
  body("isPromotionProduct").isBoolean().optional().withMessage("Invalid is promotion product"),
  body("attrs.list").isArray().optional().withMessage("Invalid attrs list"),
  body("attrs.type").isIn(["and", "or"]).optional().withMessage("Invalid attrs type"),
  body("search").isString().optional().withMessage("Invalid search"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const shop = await ShopModel.findById(req.shop._id).lean();

      const filter = req.data;
      filter.locale = req.locale;
      hydrateProductFilter(filter);
      // debug("filter", filter);
      const query = await getProductListQuery(req.shop._id, filter);
      // debug("query", JSON.stringify(query));

      const products = await ProductModel.find(query) //
        .populate(["featured_media_id", "category_ids"])
        .skip((filter.paging.page - 1) * filter.paging.size)
        .limit(filter.paging.size)
        .lean();

      const size = await ProductModel.countDocuments(query);

      res.json({
        size,
        list: products.map((p) => resProduct(p, req.locale, currencyCore.getCurrency(req), shop)),
      });
    } catch (e) {
      next(e);
    }
  },
];

function hydrateProductFilter(data: ProductFilter) {
  data.paging.size = parseInt(data.paging.size as any);
  data.paging.page = parseInt(data.paging.page as any);

  if (data.price) {
    if (data.price.min) data.price.min = parseInt(data.price.min as any);
    if (data.price.max) data.price.max = parseInt(data.price.max as any);
  }
}

async function getProductListQuery(
  shopId: mongoose.Types.ObjectId,
  filter: ProductFilter
): Promise<mongoose.FilterQuery<ProductDoc>> {
  const queries: Array<mongoose.FilterQuery<ProductDoc>> = [];
  queries.push({ shop_id: shopId });

  if (filter.price !== undefined) {
    queries.push({
      price: {
        $gte: filter.price.min,
        $lte: filter.price.max,
      },
    });
  }

  queries.push(...(await getProductListQueryCats(shopId, filter)));

  if (filter.isPromotionProduct !== undefined) {
    queries.push({ is_promotion_product: filter.isPromotionProduct });
  }

  const attrQuery = getProductListQueryAttrs(filter);
  if (attrQuery !== undefined) queries.push(attrQuery);

  setQuerySearch(queries, filter);

  return {
    $and: queries,
  };
}

function setQuerySearch(queries: Array<mongoose.FilterQuery<ProductDoc>>, filter: ProductFilter) {
  if (filter.search === undefined) return;

  // the $text in Mongdo doesn't work for partial word search
  // need to use regex
  const searchEscape = escapeRegExp(filter.search);

  queries.push({
    $or: [
      { "name.en": { $regex: new RegExp(searchEscape, "i") } },
      { "name.zhHant": { $regex: new RegExp(searchEscape, "i") } },
      { "name.zhHans": { $regex: new RegExp(searchEscape, "i") } },
      { "description.en": { $regex: new RegExp(searchEscape, "i") } },
      { "description.zhHant": { $regex: new RegExp(searchEscape, "i") } },
      { "description.zhHans": { $regex: new RegExp(searchEscape, "i") } },
      { sku: { $regex: new RegExp(searchEscape, "i") } },
    ],
  });
}

// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

async function getProductListQueryCats(
  shopId: mongoose.Types.ObjectId,
  filter: ProductFilter
): Promise<Array<mongoose.FilterQuery<ProductDoc>>> {
  if (filter.cats === undefined) return [];

  if (filter.cats.slugs !== undefined) {
    filter.cats.ids = await convertCatSlugsToCatIds(shopId, filter);
  }

  if (filter.cats.type === "or") {
    const list = await getProductListQueryCatIds(shopId, filter.cats.ids);
    let newList = [] as string[];
    for (const l of list) {
      newList = [...newList, ...l];
    }

    return [{ category_ids: { $in: newList } }];
  }

  if (filter.cats.type === "and") {
    const list = await getProductListQueryCatIds(shopId, filter.cats.ids);
    return list.map((l) => {
      return { category_ids: { $in: l } };
    });
  }

  return [];
}

async function convertCatSlugsToCatIds(shopId: mongoose.Types.ObjectId, filter: ProductFilter) {
  const localeField = localeCore.getLocaleField(filter.locale);

  const catFilter: mongoose.FilterQuery<CategoryDoc> = {
    shop_id: shopId,
    [`slug.${localeField}`]: { $in: filter.cats.slugs },
  };

  const docs = await CategoryModel.find(catFilter, ["_id"]).lean();
  return docs.map((d) => d._id as string);
}

async function getProductListQueryCatIds(shopId: mongoose.Types.ObjectId, catIds: string[]): Promise<string[][]> {
  const categories = await CategoryModel.find({ shop_id: shopId }, ["parent_id"]).lean();

  const list = [] as string[][];
  for (const catId of catIds) {
    const catIdSet = new Set<string>();
    getChildCatIds(catIdSet, catId, categories);
    list.push(Array.from(catIdSet));
  }

  return list;
}

function getChildCatIds(returnSet: Set<string>, catId: string, categories: CategoryDocLean[]) {
  returnSet.add(catId);

  const children = categories.filter((c) => {
    try {
      if (!c.parent_id) return false;
      return (c.parent_id as mongoose.Types.ObjectId).toString() === catId;
    } catch (e) {
      console.error(e);
      return false;
    }
  });

  for (const child of children) {
    getChildCatIds(returnSet, child._id.toString(), categories);
  }
}

function getProductListQueryAttrs(filter: ProductFilter): Promise<Array<mongoose.FilterQuery<ProductDoc>>> {
  if (filter.attrs === undefined) return undefined;

  const list = filter.attrs.list.map((a) => {
    return {
      attributes: {
        $elemMatch: {
          attribute_id: a.attributeId,
          [`value.${localeCore.getLocaleField(filter.locale)}`]: a.value,
        },
      },
    };
  });

  if (filter.attrs.type === "or") {
    return {
      $or: [...list],
    } as any;
  }

  if (filter.attrs.type === "and") {
    return {
      $and: [...list],
    } as any;
  }

  return undefined;
}

const single = [
  shopIdMw,
  localeMw,
  currencyMw,
  param("productId").isMongoId().exists().withMessage("Invalid productId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const fxPromise = productCore.getFxPromise(req);

      const [shop, product] = await Promise.all([
        ShopModel.findById(req.shop._id).lean(),

        ProductModel.findById(req.data.productId) //
          .populate(["featured_media_id", "gallery_ids", "description_gallery_ids", "category_ids"])
          .lean(),
      ]);

      if (fxPromise !== undefined) {
        await productCore.convertPrice(product, await fxPromise);
      }

      res.json(resProduct(product, req.locale, currencyCore.getCurrency(req), shop));
    } catch (e) {
      next(e);
    }
  },
];

export default { list, single };
