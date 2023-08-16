import Debug from "debug";
import express from "express";
import { query } from "express-validator";
import mongoose from "mongoose";

import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import AttributeModel, { AttributeDocLean, AttributionType } from "../models/attribute.model";
import CategoryModel from "../models/category.model";
import { LocaleTextDocLean } from "../models/locale.model";
import ProductModel from "../models/product.model";
import { ProductAttributeDocLean } from "../models/productAttribute.model";

// eslint-disable-next-line
const debug = Debug("project:attribute.serivce");

const list = [
  shopIdMw,
  localeMw,
  query("slugs").isArray().optional().withMessage("Invalid slugs"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const catFilter = await getCatFilter(req.data.slugs);

      const [products, attributes] = await Promise.all([
        ProductModel.find(
          {
            shop_id: req.shop._id,
            attributes: {
              $exists: true,
              $ne: [],
            },
            ...catFilter,
          },
          "attributes"
        ).lean(),
        AttributeModel.find({ shop_id: req.shop._id }).lean(),
      ]);

      const productAttrs = products
        .map((p) => p.attributes)
        .flat()
        .filter((a) => a.attribute_id !== null)
        .map((a) => {
          return {
            id: (a.attribute_id as any).toString(),
            value: getAttrValue(a, attributes, req.locale),
          };
        });

      // Use map to get the distinct
      const map = productAttrs.reduce((prev, curr) => {
        if (!prev.has(curr.id)) {
          prev.set(curr.id, new Set());
        }

        const valueSet = prev.get(curr.id);
        valueSet.add(curr.value);

        return prev;
      }, new Map<string, Set<any>>());

      // Convert the map back to array
      let arr = [...map].map(([id, valueSet]) => {
        const attrRecord = attributes.find((a) => a._id.equals(id));

        if (!attrRecord) return null;

        return {
          id,
          values: [...valueSet],
          code: attrRecord.code,
          name: localeCore.getDefaultLocaleText(req.locale, attrRecord.name),
        };
      });

      // filter empty name just in case.  Empty link means gone attribute definition.  Should not show it.
      arr = arr.filter((a) => a !== null);

      res.json(arr);
    } catch (e) {
      next(e);
    }
  },
];

function getAttrValue(productAttr: ProductAttributeDocLean, attrs: AttributeDocLean[], locale: string) {
  const attr = attrs.find((a) => a._id.equals(productAttr.attribute_id));

  switch (attr.type) {
    case AttributionType.number:
      return productAttr.value as number;
    case AttributionType.string:
      return localeCore.getDefaultLocaleText(locale, productAttr.value as LocaleTextDocLean);
    default:
      return null;
  }
}

async function getCatFilter(slugs: string[]) {
  if (!slugs) return {};
  const cats = await CategoryModel.find({ "slug.en": { $in: slugs } });
  const arr: mongoose.Types.ObjectId[] = [];

  // for each cat, return an array containing the catId and all nested children ids
  cats.map(async (c) => await getCatChildrenRecursive(c._id, arr));

  if (arr.length > 0) {
    const mapped = arr.map((c) => ({ category_ids: { $in: c } }));

    return {
      $and: mapped,
    };
  }
  return {};
}

async function getCatChildrenRecursive(catId: mongoose.Types.ObjectId, arr: mongoose.Types.ObjectId[]) {
  arr.push(catId);
  const children = await CategoryModel.find({ parent_id: catId });

  if (children) {
    const childrenId = children.map((c) => c._id);
    for (const id of childrenId) {
      await getCatChildrenRecursive(id, arr);
    }
  }
}

export default {
  list,
};
