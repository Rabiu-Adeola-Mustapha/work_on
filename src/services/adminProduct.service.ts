import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import counterCore from "../core/counter.core";
import localeCore from "../core/locale.core";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import { AttributeDocLean } from "../models/attribute.model";
import CategoryModel, { CategoryDocLean } from "../models/category.model";
import MediaModel, { MediaDocLean } from "../models/media.model";
import ProductModel, { ProductDocLean, ProductType } from "../models/product.model";
import { ProductAttributeDocLean } from "../models/productAttribute.model";
import ShopModel from "../models/shop.model";
import { responseCategory } from "./adminCategory.service";
import { responseMedia } from "./adminMedia.service";

// eslint-disable-next-line
const debug = Debug("project:adminProduct.service");

const list = [
  shopIdMw,
  localeMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [products, shop] = await Promise.all([
        ProductModel.find({
          shop_id: req.shop._id,
          product_type: { $nin: [ProductType.variationChild] },
        })
          .populate(["category_ids", "gallery_ids", "featured_media_id"])
          .lean(),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      res.json(products.map((p) => responseProduct(p, req.locale, shop.product_prefix)));
    } catch (e) {
      next(e);
    }
  },
];

const get = [
  shopIdMw,
  localeMw,
  query("productId").isMongoId().exists().withMessage("Invalid product id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [product, shop] = await Promise.all([
        ProductModel.findOne({
          shop_id: req.shop._id,
          _id: req.data.productId,
        })
          .populate(["gallery_ids", "featured_media_id", "relatedProductIds"])
          .lean(),

        ShopModel.findById(req.shop._id).lean(),
      ]);

      // debug("product", product);
      if (product.product_type !== ProductType.variationParent) {
        res.json(responseProduct(product, req.locale, shop.product_prefix));
        return;
      }
      // populate variations
      const childProducts = await ProductModel.find({
        shop_id: req.shop._id,
        parent_id: product._id,
      })
        .populate(["attributes.attribute_id", "gallery_ids"])
        .lean();

      // debug("childProducts", childProducts);
      // debug("a", childProducts[0].attributes);

      res.json(responseProductVariation(product, childProducts, req.locale, shop.product_prefix));
    } catch (e) {
      next(e);
    }
  },
];

const createValidators = [
  body("name.en").optional().isString().withMessage("Invalid name en"),
  body("name.zhHant").optional().isString().withMessage("Invalid name zhHant"),
  body("name.zhHans").optional().isString().withMessage("Invalid name zhHans"),
  body("description.en").optional().isString().withMessage("Invalid description en"),
  body("description.zhHant").optional().isString().withMessage("Invalid description zhHant"),
  body("description.zhHans").optional().isString().withMessage("Invalid description zhHans"),
  body("shortDescription.en").optional().isString().withMessage("Invalid description en"),
  body("shortDescription.zhHant").optional().isString().withMessage("Invalid description zhHant"),
  body("shortDescription.zhHans").optional().isString().withMessage("Invalid description zhHans"),
  body("price").isNumeric().optional().withMessage("Invalid price"),
  body("categoryIds").optional().isArray().withMessage("Invalid category ids"),
  body("galleryIds").optional().isArray().withMessage("Invalid gallery ids"),
  body("featuredImgId").optional().isMongoId().withMessage("Invalid featured img id"),
  body("descriptionGalleryIds").optional().isArray().withMessage("Invalid description gallery ids"),
  body("sku").optional().isString().withMessage("Invalid sku"),
  body("isPromotionProduct").optional().isBoolean().withMessage("Invalid promotion product"),
  body("productType")
    .default("simple")
    .isIn(["simple", "variationParent", "variationChild"])
    .withMessage("Invalid productType"),
  body("parentId")
    .custom((parentId, { req }) => {
      if (req.body.productType === "variationChild") return parentId !== undefined;
      else return parentId === undefined;
    })
    .withMessage("parentId should be provided for variationChild")
    .optional()
    .isMongoId(),
  body("attributes").isArray().optional().withMessage("invalid attributes"),
  body("rewardPayout").isNumeric().optional().withMessage("invalid rewardPayout"),
  body("relatedProductIds").isArray().optional().withMessage("invalid relatedProductIds"),
  body("availability").isIn(["in", "out"]).optional().default("in").withMessage("invalid availability"),
  body("stockReadyDate")
    .isString()
    .optional()
    .default("")
    .matches(/^$|^\d{4}-\d{2}-\d{2}$/)
    .withMessage("invalid stockReadyDate"),
];

async function createCheckReferenceIds(req: express.Request) {
  return await Promise.all([
    CategoryModel.find(
      {
        shop_id: req.shop._id,
        _id: { $in: req.data.categoryIds },
      },
      "_id"
    ).lean(),
    MediaModel.find(
      {
        shopId: req.shop._id,
        _id: { $in: req.data.galleryIds },
      },
      "_id"
    ).lean(),
    MediaModel.find(
      {
        shopId: req.shop._id,
        _id: { $in: req.data.descriptionGalleryIds },
      },
      "_id"
    ).lean(),
    MediaModel.findOne(
      {
        shopId: req.shop._id,
        _id: { $in: req.data.featuredImgId },
      },
      "_id"
    ).lean(),
    ProductModel.find(
      {
        shop_id: req.shop._id,
        _id: { $in: req.data.relatedProductIds },
      },
      "_id"
    ).lean(),
  ]);
}

const update = [
  shopIdMw,
  localeMw,
  body("productId").isMongoId().exists().withMessage("Invalid product id"),
  ...createValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // make sure cat ids are valid
      const [catIds, mediaIds, descriptionMediaIds, featuredImageId, relatedProductIds] = await createCheckReferenceIds(
        req
      );

      sanitizeCreateInput(req);

      const shop = await ShopModel.findById(req.shop._id).lean();
      const product = await ProductModel.findOneAndUpdate(
        { _id: req.data.productId },
        {
          $set: {
            shop_id: req.shop._id,
            name: req.data.name,
            description: req.data.description,
            shortDescription: req.data.shortDescription,
            price: req.data.price,
            category_ids: catIds.map((c) => c._id),
            gallery_ids: mediaIds.map((c) => c._id),
            description_gallery_ids: descriptionMediaIds.map((c) => c._id),
            featured_media_id: featuredImageId ? featuredImageId._id : undefined,
            sku: req.data.sku,
            is_promotion_product: req.data.isPromotionProduct,
            attributes: toVariationAttrs(req.data.attributes),
            rewardPayout: req.data.rewardPayout,
            relatedProductIds: relatedProductIds.map((r) => r._id),
            availability: req.data.availability,
            stockReadyDate: req.data.stockReadyDate,
            product_type: req.data.productType,
            updateAt: Date.now(),
          },
        }
      );

      res.json(responseProduct(product, req.locale, shop.product_prefix));
    } catch (e) {
      next(e);
    }
  },
];

function toVariationAttrs(vaS: [{ attributeId: string; value: string | number }]) {
  if (!vaS) return undefined;

  return vaS.map((v) => {
    return {
      attribute_id: v.attributeId,
      value: v.value,
    };
  });
}

const create = [
  shopIdMw,
  localeMw,
  ...createValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // make sure cat ids are valid
      const [catIds, mediaIds, descriptionMediaIds, featuredImageId, relatedProductIds] = await createCheckReferenceIds(
        req
      );

      sanitizeCreateInput(req);
      const shop = await ShopModel.findById(req.shop._id).lean();
      const sequence = await counterCore.getNextSequence(req.shop._id, "product");

      const product = await ProductModel.create({
        shop_id: req.shop._id,
        name: req.data.name,
        description: req.data.description,
        shortDescription: req.data.shortDescription,
        price: req.data.price,
        product_number: sequence,
        category_ids: catIds.map((c) => c._id),
        gallery_ids: mediaIds.map((c) => c._id),
        description_gallery_ids: descriptionMediaIds.map((c) => c._id),
        featured_media_id: featuredImageId ? featuredImageId._id : undefined,
        created_by: req.adminUser._id,
        sku: req.data.sku,
        is_promotion_product: req.data.isPromotionProduct,
        product_type: req.data.productType,
        parent_id: req.data.parentId,
        attributes: toVariationAttrs(req.data.attributes),
        rewardPayout: req.data.rewardPayout,
        relatedProductIds: relatedProductIds.map((r) => r._id),
        availability: req.data.availability,
        stockReadyDate: req.data.stockReadyDate,
      });

      res.json(responseProduct(product, req.locale, shop.product_prefix));
    } catch (e) {
      next(e);
    }
  },
];

function sanitizeCreateInput(req: express.Request) {
  if (req.data.attributes) {
    req.data.attributes = req.data.attributes.filter((a: any) => a.value);
  }
}

export function responseProduct(product: ProductDocLean, locale: string, prefix: string): any {
  const productNumber = counterCore.getFormattedSequence(prefix, product.product_number);

  return {
    id: product._id,
    name: product.name,
    description: product.description,
    productNumber,
    shortDescription: product.shortDescription,
    price: product.price,
    galleries:
      product.gallery_ids === undefined ? undefined : (product.gallery_ids as MediaDocLean[]).map(responseMedia),
    descriptionGalleries:
      product.description_gallery_ids === undefined
        ? undefined
        : (product.description_gallery_ids as MediaDocLean[]).map(responseMedia),
    featureMedia:
      product.featured_media_id === undefined ? undefined : responseMedia(product.featured_media_id as MediaDocLean),
    categories:
      product.category_ids === undefined
        ? undefined
        : (product.category_ids as CategoryDocLean[]).map(responseCategory),
    sku: product.sku,
    isPromotionProduct: product.is_promotion_product,
    productType: product.product_type,
    attributes:
      product.attributes === undefined ? undefined : product.attributes.map((va) => responseAttribute(va, locale)),
    rewardPayout: product.rewardPayout,
    relatedProducts:
      product.relatedProductIds === undefined
        ? undefined
        : (product.relatedProductIds as ProductDocLean[]).map((rp) => responseProduct(rp, locale, prefix)),
    availability: product.availability,
    stockReadyDate: product.stockReadyDate,
  };
}

function responseProductVariation(
  product: ProductDocLean,
  childProducts: ProductDocLean[],
  locale: string,
  productPrefix: string
) {
  return {
    ...responseProduct(product, locale, productPrefix),
    variations: childProducts.map((p) => responseChild(p, locale)),
  };
}

function responseChild(childProduct: ProductDocLean, locale: string) {
  return {
    id: childProduct._id,
    sku: childProduct.sku,
    price: childProduct.price,
    galleries: (childProduct.gallery_ids as MediaDocLean[]).map(responseMedia),
    descriptionGalleries: (childProduct.description_gallery_ids as MediaDocLean[]).map(responseMedia),
    featureMedia:
      childProduct.featured_media_id === undefined
        ? undefined
        : responseMedia(childProduct.featured_media_id as MediaDocLean),
    attributes: childProduct.attributes.map((va) => {
      return {
        attributeId: va.attribute_id._id,
        name: localeCore.getDefaultLocaleText(locale, (va.attribute_id as AttributeDocLean).name),
        type: (va.attribute_id as AttributeDocLean).type,
        value: va.value,
      };
    }),
    availability: childProduct.availability,
    stockReadyDate: childProduct.stockReadyDate,
  };
}

function responseAttribute(va: ProductAttributeDocLean, locale: string) {
  if (va.attribute_id === null) return null;

  return {
    attributeId: va.attribute_id._id,
    name: localeCore.getDefaultLocaleText(locale, (va.attribute_id as AttributeDocLean).name),
    type: (va.attribute_id as AttributeDocLean).type,
    value: va.value,
  };
}

export default {
  list,
  create,
  update,
  get,
};
