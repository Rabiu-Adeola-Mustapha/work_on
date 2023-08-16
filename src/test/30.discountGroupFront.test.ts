import Debug from "debug";
import request from "supertest";

import app from "../app";
import DiscountGroupModel from "../models/discountGroup.model";
import ProductModel, { ProductDocLean } from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:30.discountGroup.test");

async function getCartId() {
  const res = await request(app).get("/public/cart/getId").set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  return res.body.cartId;
}

async function getGroup(placement: string, scope: string, products: ProductDocLean[]) {
  const scopeObj =
    scope === "product" ? { attachToProductIds: products[0]._id } : { attachToCatIds: products[0].category_ids[0] };

  return await DiscountGroupModel.findOneAndUpdate(
    { shopId: testData.shopAtilio.doc._id, placement, productsScope: "products" },
    {
      $addToSet: {
        ...scopeObj,
        discountProducts: [{ productId: products[1]._id, discountType: "percentage", discountPrice: 10 }],
      },
    },
    { upsert: true, new: true }
  );
}

describe("Discount Group Front Test", () => {
  let cartId: string;
  let attachedToProdId: ProductDocLean;
  //   let group1: DiscountGroupDocLean;
  //   let group2: DiscountGroupDocLean;

  before(async () => {
    const products = await ProductModel.find({ shop_id: testData.shopAtilio.doc._id }).limit(3).lean();
    await getGroup("product", "products", products);
    await getGroup("checkout", "cats", products);
    cartId = await getCartId();
    attachedToProdId = products[0]._id;
  });

  it("List Product Discount Products", async () => {
    const res = await request(app)
      .post(`/public/discountGroup/list`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        cartId,
        productIds: [attachedToProdId],
        placement: "product",
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
  });

  it("List Checkout Discount Products", async () => {
    const res = await request(app)
      .post(`/public/discountGroup/list`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        cartId,
        productIds: [attachedToProdId],
        placement: "checkout",
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
  });
});
