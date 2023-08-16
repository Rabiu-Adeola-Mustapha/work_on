import Debug from "debug";
import request from "supertest";

import app from "../app";
import CategoryModel from "../models/category.model";
import DiscountGroupModel from "../models/discountGroup.model";
import ProductModel from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:29.adminDiscountGroup.test");

describe("Discount Group Test", () => {
  let categoryGroupId: string;
  let productsGroupId: string;
  let productId: string;
  let product2Id: string;
  let product3Id: string;
  let categoryId: string;

  before(async () => {
    const products = await ProductModel.find({ shop_id: testData.shopAtilio.doc._id }).limit(3).lean();
    const category = await CategoryModel.findOne().lean();
    productId = products[0]._id;
    product2Id = products[1]._id;
    product3Id = products[2]._id;
    categoryId = category._id;
  });

  it("Create Discount Group - Checkout", async () => {
    const res = await request(app)
      .post("/admin/discountGroup/create")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        name: "group 1",
        placement: "checkout",
        productsScope: "cats",
        attachToCatIds: [categoryId],
        discountProducts: [{ productId, discountType: "fixed", discountPrice: 99 }],
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    categoryGroupId = res.body._id;

    res.body.placement.should.equal("checkout");
    res.body.attachToCatIds[0].should.equal(categoryId.toString());
    res.body.discountProducts.length.should.equal(1);
    res.body.discountProducts[0].productId.should.equal(productId.toString());
    res.body.discountProducts[0].discountPrice.should.equal(99);
  });

  it("Create Discount Group - Products", async () => {
    const res = await request(app)
      .post("/admin/discountGroup/create")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        name: "group 2",
        placement: "product",
        productsScope: "products",
        attachToProductIds: [productId],
        discountProducts: [
          { productId: product2Id, discountType: "fixed", discountPrice: 12 },
          { productId: product3Id, discountType: "percentage", discountPercentage: 10 },
        ],
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    productsGroupId = res.body._id;
  });

  it("List Discount Groups", async () => {
    const res = await request(app)
      .get("/admin/discountGroup/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.length.should.equal(2);
  });

  it("Get Single Discount Group", async () => {
    const res = await request(app) //
      .get(`/admin/discountGroup/get?groupId=${categoryGroupId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body._id.should.equal(categoryGroupId);
  });

  it("Update Discount Group", async () => {
    let doc = await DiscountGroupModel.findOne({ _id: productsGroupId }).lean();

    const res = await request(app) //
      .post(`/admin/discountGroup/edit?groupId=${productsGroupId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        name: "Group 2 - 3",
        placement: doc.placement,
        productsScope: doc.productsScope,
        attachToProductIds: doc.attachToProductIds,
        discountProducts: doc.discountProducts,
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);

    doc = await DiscountGroupModel.findOne({ _id: productsGroupId }).lean();
    doc.name.should.equal("Group 2 - 3");
  });
});
