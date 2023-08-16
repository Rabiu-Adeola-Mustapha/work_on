import Debug from "debug";
import express from "express";
import { body } from "express-validator";
import mongoose from "mongoose";

import currencyCore from "../core/currency.core";
import currencyMw from "../middleware/currency.mw";
import localeMw from "../middleware/locale.mw";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import CartModel, { CartDocLean } from "../models/cart.model";
import DiscountGroupModel, { DiscountGroupDocLean, DiscountProductDocLean } from "../models/discountGroup.model";
import ProductModel, { ProductDocLean, resProduct } from "../models/product.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:adminDiscountGroup.service");

const listProducts = [
  shopIdMw,
  localeMw,
  currencyMw,
  body("productIds").exists().isArray().withMessage("invalid product Ids"),
  body("cartId").isString().withMessage("Missing cart Id"),
  body("placement").isString().withMessage("missing discount placement"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const [products, shop, cart] = await Promise.all([
        ProductModel.find({ _id: { $in: req.data.productIds } }).lean(),
        ShopModel.findById({ _id: req.shop._id }).lean(),
        CartModel.findById({ _id: req.data.cartId }).lean(),
      ]);

      let records: any[] = [];
      for (const product of products) {
        const discountGroups = await DiscountGroupModel.find({
          placement: req.data.placement,
          $or: [{ attachToProductIds: { _id: product._id } }, { attachToCatIds: { $in: product.category_ids } }],
        })
          .populate({
            path: "discountProducts.productId",
            model: "Product",
            populate: {
              path: "featured_media_id",
            },
          })
          .lean();

        if (!discountGroups) continue;
        const discountProducts = await getDiscountProducts(discountGroups, product, req, shop);
        records = [...records, ...discountProducts];
      }

      if (records.length < 1) {
        return res.json([]);
      }

      res.json(selectRandomProducts(records, cart, req.data.productIds, 5));
    } catch (e) {
      next(e);
    }
  },
];

const getDiscountProducts = async (
  discountGroups: DiscountGroupDocLean[],
  attachedToProd: ProductDocLean,
  req: express.Request,
  shop: ShopDocLean
) => {
  return discountGroups
    .flatMap((group) => group.discountProducts)
    .map((p) => {
      const resP = resProduct(p.productId as ProductDocLean, req.locale, currencyCore.getCurrency(req), shop);
      const { discountPrice, discountPercentage } = getPriceAndPercentage(p);
      return {
        ...resP,
        discountPrice,
        discountPercentage,
        attachToProductId: attachedToProd._id,
      };
    });
};

const getPriceAndPercentage = (discountProduct: DiscountProductDocLean) => {
  const productPrice = (discountProduct.productId as ProductDocLean).price;

  switch (discountProduct.discountType) {
    case "fixed": {
      const discountPrice = discountProduct.discountPrice;
      const priceToPercentage = (((productPrice - discountPrice) / productPrice) * 100).toFixed(2);
      return { discountPrice, discountPercentage: priceToPercentage };
    }
    case "percentage": {
      const discountPercentage = discountProduct.discountPercentage;
      const percentageToPrice = productPrice - (discountPercentage / 100) * productPrice;
      return { discountPrice: percentageToPrice, discountPercentage };
    }
    default:
      throw new Error("invalid discount type");
  }
};

const selectRandomProducts = (
  discountProdctsArr: DiscountProductDocLean[],
  cart: CartDocLean,
  discountLookupProds: string[],
  n: number
) => {
  // get cart items attached to lookup and map to discountProduct
  const attachedToLookup = cart.items
    .filter((i) => discountLookupProds.includes((i?.attached_to as mongoose.Types.ObjectId)?.toString()))
    .map((j) => discountProdctsArr.find((p) => (j.product_id as mongoose.Types.ObjectId).equals(p.id)))
    .filter((i) => i !== undefined);

  // get only products that are not in the cart and not a lookup product
  const nonCartProducts = discountProdctsArr.filter((p) => {
    const inCart = cart.items.find((i) => (i.product_id as mongoose.Types.ObjectId).equals(p.id));
    const isLookupProduct = discountLookupProds.includes((p?.id as mongoose.Types.ObjectId)?.toString());
    return !inCart && !isLookupProduct;
  });

  const result = [];
  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * nonCartProducts.length);
    const item = nonCartProducts.splice(randomIndex, 1)[0];

    //  if available discount products is less than n skip undefined
    if (item === undefined) continue;
    result.push(item);
  }
  return [...result, ...attachedToLookup];
};

export default { listProducts };
