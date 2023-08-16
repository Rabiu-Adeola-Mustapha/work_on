import chai from "chai";
import Debug from "debug";
import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import counterCore from "../core/counter.core";
import ProductModel from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:product.test");

chai.should();

async function listProducts(page: number, size: number) {
  const res = await request(app) //
    .post("/public/product/list")
    .send({
      paging: {
        size,
        page,
      },
    })
    .set("shop-id", testData.shopAtilio.doc._id);

  res.status.should.equal(200);
  return res;
}

let firstProduct: any = null;

describe("Product Test", async () => {
  it("List Products - No Shop Id", async () => {
    const res = await request(app).post("/public/product/list");
    res.status.should.equal(401);
  });

  it("List Product - Success", async () => {
    const res = await request(app) //
      .post("/public/product/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.size.should.equal(1);
    res.body.list.length.should.equal(1);
    res.body.list[0].name.should.equal("GIORDANO Clothes");

    firstProduct = res.body.list[0];
  });

  it("List Product - Chinese", async () => {
    const res = await request(app) //
      .post("/public/product/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "zh-Hant");

    res.status.should.equal(200);
    res.body.list[0].name.should.equal("GIORDANO BM 女裝三條裝彈力棉純色三角內褲");
  });

  it("List Product - Don't show other shop", async () => {
    const product = await ProductModel.findOne({ shop_id: testData.shopAtilio.doc._id }).lean();

    delete product._id;
    product.shop_id = testData.daydaybuy.doc._id;
    product.product_number = await counterCore.getNextSequence(product.shop_id as mongoose.Types.ObjectId, "product");

    await ProductModel.create(product);

    const res = await request(app) //
      .post("/public/product/list")
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    res.body.list.length.should.equal(1);
  });
});

function productListEqual(list1: any[], list2: any[]) {
  if (list1.length !== list2.length) return false;

  for (let i = 0; i < list1.length; i++) {
    if (list1[i].id !== list2[i].id) {
      return false;
    }
  }

  return true;
}

describe("Proudct List Paging", () => {
  let products: any[] = [];

  before(async () => {
    const res = await request(app) //
      .post("/test/clone100Products?specialCode=wERKJFDkewdso34S!8s");
    res.status.should.equal(200);
  });

  it("Get 9999, Page 1", async () => {
    const res = await listProducts(1, 9999);
    products = res.body.list;
  });

  it("Get 20, Page 1", async () => {
    const res = await listProducts(1, 20);
    res.body.size.should.equal(101);
    productListEqual(products.slice(0, 20), res.body.list).should.be.true;
  });

  it("Get 20, Page 2", async () => {
    const res = await listProducts(2, 20);
    productListEqual(products.slice(20, 40), res.body.list).should.be.true;
  });
});

describe("Product Single Test", () => {
  it("Chinese Name", async () => {
    // debug("product id", firstProduct);
    const res = await request(app) //
      .get(`/public/product/single/${firstProduct.id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "zh-Hant");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    // debug("Product Item", res.body);
    res.body.name.should.equal("GIORDANO BM 女裝三條裝彈力棉純色三角內褲");
  });

  it("USD", async () => {
    const res = await request(app) //
      .get(`/public/product/single/${firstProduct.id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("currency", "USD");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.price.should.equal(firstProduct.price * 0.13);
    res.body.currency.should.equal("USD");
  });
});
