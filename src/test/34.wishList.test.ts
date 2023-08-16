import Debug from "debug";
import request from "supertest";

import app from "../app";
import ProductModel, { ProductDocLean } from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:wishList.test");

async function getWishList(wishListId: string) {
  return await request(app) //
    .get(`/public/wishList/get?wishListId=${wishListId}`)
    .set("shop-id", testData.shopAtilio.doc._id);
}

describe("WishList Test", async () => {
  let wishListId: string;
  let addingProduct: ProductDocLean;

  it("Get WishList ID", async () => {
    const res = await request(app) //
      .get("/public/wishList/getId")
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.wishListId !== undefined).should.be.true;
    wishListId = res.body.wishListId;
  });

  it("Add To WishList", async () => {
    const product = await ProductModel.findOne().lean();
    addingProduct = product;

    const res = await request(app)
      .post("/public/wishList/update") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        wishListId,
        addId: product._id,
      });
    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
  });

  it("Get WishList", async () => {
    const res = await getWishList(wishListId);

    res.status.should.equal(200);

    res.body.products.length.should.equal(1);
    res.body.products[0].id.should.equal(addingProduct._id.toString());
    res.body.products[0].name.should.equal(addingProduct.name.en);
    (res.body.products[0].featureMedia.url !== undefined).should.be.true;
  });

  it("Remove From WishList", async () => {
    const res = await request(app)
      .post("/public/wishList/update") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        wishListId,
        deleteId: addingProduct._id,
      });

    if (res.error) {
      console.error(res.error);
    }

    (await getWishList(wishListId)).body.products.length.should.equal(0);
    res.status.should.equal(200);
  });
});
