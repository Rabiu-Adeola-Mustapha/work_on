import fsPromises from "fs/promises";
import path from "path";

import axios from "axios";
import Debug from "debug";
import express from "express";
import { body } from "express-validator";
import { UploadFile } from "media";
import mongoose from "mongoose";

import counterCore from "../core/counter.core";
import mediaCore from "../core/media.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import AttributeModel, { AttributeDocLean, AttributionType } from "../models/attribute.model";
import CategoryModel, { CategoryDocLean } from "../models/category.model";
import { AvailableLocales, LocaleTextPoJo } from "../models/locale.model";
import ProductModel from "../models/product.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import config from "../utils/config";

// eslint-disable-next-line
const debug = Debug("project:adminProductImport");

export interface ProductImport {
  [key: `attr${string}`]: string;
  [key: `category${string}`]: string;
  [key: `description${string}`]: string;
  [key: `shortDescription${string}`]: string;
  [key: `name${string}`]: string;
  price: number;
  sku: string;
  featuredImg: string;
}

const importProducts = [
  shopIdMw,
  localeMw,
  body("products").isArray().withMessage("invalid products"),
  body("products.*.name.en").isString().optional().withMessage("invalid nameEn in porudcts array"),
  body("products.*.name.zhHant").isString().optional().withMessage("invalid nameZhant in porudcts array"),
  body("products.*.name.zhHans").isString().optional().withMessage("invalid nameZhans in porudcts array"),
  body("products.*.description.en").isString().optional().withMessage("invalid descriptionEn in porudcts array"),
  body("products.*.description.zhHant").isString().optional().withMessage("invalid descriptionZhant in porudcts array"),
  body("products.*.description.zhHans").isString().optional().withMessage("invalid descriptionZhans in porudcts array"),
  body("products.*.shortDescription.en")
    .isString()
    .optional()
    .withMessage("invalid shortDescriptionEn in porudcts array"),
  body("products.*.shortDescription.zhHant")
    .isString()
    .optional()
    .withMessage("invalid shortDescriptionZhant in porudcts array"),
  body("products.*.shortDescription.zhHans")
    .isString()
    .optional()
    .withMessage("invalid shortDescriptionZhans in porudcts array"),
  body("products.*.sku").isString().withMessage("invalid sku in products array"),
  body("products.*.price").isNumeric().withMessage("invalid price in products array"),
  body("products.*.featuredImg").isString().optional().withMessage("invalid featuredImg in products array"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [attributes, categories] = await Promise.all([
        AttributeModel.find({ shop_id: req.shop._id }).lean(),
        CategoryModel.find({ shop_id: req.shop._id }).lean(),
      ]);

      const productImports = req.data.products as ProductImport[];

      const rstList = [];

      for (const p of productImports) {
        rstList.push(await createProduct(p, attributes, categories, req));
      }

      for (const p of productImports) {
        await setRelatedProducts(p, req);
      }

      await setFeaturedImgs(productImports, req);

      res.json(rstList);
    } catch (e) {
      next(e);
    }
  },
];

async function createProduct(
  productImport: ProductImport,
  attributes: AttributeDocLean[],
  categories: CategoryDocLean[],
  req: express.Request
) {
  const attrs = getAttributesRef(productImport, { attributes });
  const catIds = getCatIds(productImport, categories);

  const errors = [
    ...catIds.filter((c) => c.error).map((f) => f.error),
    ...attrs.filter((a) => a.error).map((f) => f.error),
  ];

  if (errors.length > 0) {
    return {
      sku: productImport.sku,
      success: false,
      errors,
    };
  }

  // check duplicate
  const exists = await ProductModel.exists({
    shop_id: new mongoose.Types.ObjectId(req.shop._id),
    sku: productImport.sku,
  });

  if (exists) {
    return {
      sku: productImport.sku,
      sucess: false,
      errors: [`sku: '${productImport.sku}' already exists.`],
    };
  }

  const sequence = await counterCore.getNextSequence(req.shop._id, "product");

  const newProduct = await ProductModel.create({
    shop_id: new mongoose.Types.ObjectId(req.shop._id),
    merchant_id: null,
    product_number: sequence,
    price: productImport.price,
    sku: productImport.sku,
    name: getLocaleText(productImport, /name.(.+)/),
    shortDescription: getLocaleText(productImport, /shortDescription.(.+)/),
    description: getLocaleText(productImport, /description.(.+)/),
    attributes: attrs.map((a) => a.data) as any,
    category_ids: catIds.map((c) => c.data),
    // relatedProducts: relatedProductIds,
    created_by: req.adminUser._id,
  });

  return {
    sku: productImport.sku,
    id: newProduct._id,
    success: true,
  };
}

function getLocaleText(productImport: ProductImport, prefixRegex: RegExp): LocaleTextPoJo {
  const matchingPrefixKeys = Object.entries(productImport).filter(([key]) => prefixRegex.test(key));

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

const isObject = (obj: any) => {
  return Object.prototype.toString.call(obj) === "[object Object]";
};

function confirmValueType(attr: AttributeDocLean, value: any) {
  if (attr.type === AttributionType.number) {
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw Error(`Value from attr '${attr.code}' is not a numeric field`);
    }
    return num;
  }

  if (attr.type === AttributionType.string) {
    if (!isObject(value)) throw Error(`The value of attr '${attr.code}' is not a valid locale: ${value as string}`);

    if ("en" in value || "zhHant" in value || "zhHans" in value) {
      return value as LocaleTextPoJo;
    } else {
      throw Error(`The values does not contain any valid locale: ${JSON.stringify(value)}`);
    }
  }

  return null;
}

interface AttrRst {
  data?: {
    attribute_id: any;
    value: number | LocaleTextPoJo;
  };
  error?: string;
}

function getAttributesRef(productImport: ProductImport, { attributes }: { attributes: AttributeDocLean[] }): AttrRst[] {
  const attrs = parseAttrToObj(productImport);

  const attrRefs = Array.from(attrs, ([key, value]) => {
    const attr = attributes.find((a) => a.code === key);

    if (!attr) {
      return {
        error: `Unable to find attribute: '${key}'`,
      };
    }

    try {
      const confirmedValue = confirmValueType(attr, value);

      return {
        data: {
          attribute_id: attr._id,
          value: confirmedValue,
        },
      };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  return attrRefs;
}

interface CatIdRst {
  data?: mongoose.Types.ObjectId;
  error?: string;
}

function getCatIds(productImport: ProductImport, categories: CategoryDocLean[]): CatIdRst[] {
  const catCodes = Object.entries(productImport)
    .filter(([key]) => key.startsWith("category."))
    .map(([, catCode]) => catCode as string);

  return catCodes.map((code) => {
    const foundCat = categories.find((c) => c.code === code);

    if (!foundCat) {
      return {
        error: `Unable to find category: "${code}"`,
      };
    }

    return {
      data: foundCat._id,
    };
  });
}

interface RelatedProductIdRst {
  data?: mongoose.Types.ObjectId;
  error?: string;
}

async function getRelatedProductIds(
  productImport: ProductImport,
  shopId: mongoose.Types.ObjectId
): Promise<RelatedProductIdRst[]> {
  const relatedSkus = Object.entries(productImport)
    .filter(([key]) => key.startsWith("related."))
    .map(([, catCode]) => catCode as string);

  const promises = relatedSkus.map(async (sku) => {
    const record = await ProductModel.findOne({ shop_id: shopId, sku }).select("_id").lean();

    if (!record) {
      return {
        error: `Unable to find related product: "${sku}"`,
      };
    }

    return { data: record._id };
  });

  return await Promise.all(promises);

  // const records = await ProductModel.find({
  //   shop_id: shopId,
  //   sku: { $in: relatedSkus },
  // })
  //   .select("_id")
  //   .lean();

  // return records.map((r) => r._id);
}

function parseAttrToObj(productImport: ProductImport) {
  const localeRegex = /attr.(.+)\.(.+)/;
  const valueRegex = /attr.(.+)/;

  const obj = new Map<string, number | Partial<LocaleTextPoJo>>();

  return Object.entries(productImport).reduce((prev, [currKey, currVal]) => {
    if (localeRegex.test(currKey)) {
      const [, code, locale] = currKey.match(localeRegex);

      if (!AvailableLocales.includes(locale)) {
        return prev;
      }

      if (!prev.has(code)) {
        prev.set(code, {});
      }

      (prev.get(code) as any)[locale] = currVal;

      return prev;
    }

    if (valueRegex.test(currKey)) {
      const [, code] = currKey.match(valueRegex);
      prev.set(code, parseFloat(currVal));
      return prev;
    }

    return prev;
  }, obj);
}

async function setRelatedProducts(productImport: ProductImport, req: express.Request) {
  const relatedProductIds = await getRelatedProductIds(productImport, req.shop._id);

  const errors = relatedProductIds.filter((r) => r.error).map((f) => f.error);

  if (errors.length > 0) {
    return {
      sku: productImport.sku,
      success: false,
      errors,
    };
  }

  if (relatedProductIds.length === 0) return;

  await ProductModel.findOneAndUpdate(
    {
      shop_id: req.shop._id,
      sku: productImport.sku,
    },
    {
      $set: {
        relatedProductIds: relatedProductIds.map((r) => r.data),
      },
    }
  );
}

async function setFeaturedImgs(productImports: ProductImport[], req: express.Request) {
  const shop = await ShopModel.findById(req.shop._id);

  for (const productImport of productImports) {
    await setFeaturedImg(productImport, shop, req);
  }
}

async function setFeaturedImg(productImport: ProductImport, shop: ShopDocLean, req: express.Request) {
  if (!productImport.featuredImg) return;
  if (productImport.featuredImg === "http://www.officeman.com.hk/image/cache/") return;

  const file = await downloadFeaturedImg(productImport);

  if (!file) return;

  try {
    const { size } = await fsPromises.stat(file);

    const uploadFile: UploadFile = {
      originalname: path.basename(productImport.featuredImg),
      path: file,
      size,
    };

    // debug("Uploading file to S3", productImport.featuredImg);
    const mediaRecord = await mediaCore.uploadToS3AndSaveDb(uploadFile, shop, req.adminUser);

    await ProductModel.findOneAndUpdate(
      {
        shop_id: shop._id,
        sku: productImport.sku,
      },
      {
        $set: {
          featured_media_id: mediaRecord._id,
        },
      }
    );

    // debug("Deleting Temp File", file);
    await fsPromises.unlink(file);
  } catch (e) {
    console.error(e);
  }
}

async function downloadFeaturedImg(productImport: ProductImport) {
  try {
    const uuid = crypto.randomUUID();
    const file = path.join(config.imageFolder, uuid);

    // debug(`Downloading Featured Img from ${productImport.featuredImg} to ${file}`);

    const res = await axios.get(productImport.featuredImg, { responseType: "arraybuffer" });
    await fsPromises.writeFile(file, res.data);

    return file;
  } catch (e) {
    console.error("Failed to download", productImport.featuredImg);
    return null;
  }
}

export default {
  importProducts,
};
