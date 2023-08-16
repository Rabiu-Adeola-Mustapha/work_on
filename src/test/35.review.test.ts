import Debug from "debug";
import request from "supertest";

import app from "../app";
import OrderModel, { OrderDocLean } from "../models/order.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:review.test");

describe("Reviews Test", async () => {
  let order1: OrderDocLean;
  let order2: OrderDocLean;
  let productId: string;

  before(async () => {
    order1 = await OrderModel.findOneAndUpdate(
      {
        shopId: testData.shopAtilio.doc._id,
        userId: testData.front.userJason.doc._id,
        products: { $size: 3 },
      },
      { $set: { status: "delivered" } }
    );

    productId = order1.products[0]._id;

    order2 = await OrderModel.findOneAndUpdate(
      {
        shopId: testData.shopAtilio.doc._id,
        userId: testData.front.userJason.doc._id,
        products: { $size: 1, $elemMatch: { _id: productId } },
      },
      { $set: { status: "delivered" } }
    );
  });

  it("Gets Pending Reviews", async () => {
    const res = await request(app)
      .post("/public/review/getPending") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    res.body.length.should.equal(4);
  });

  it("Create Review", async () => {
    const res = await request(app)
      .post("/public/review/create") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        productId,
        rating: 4,
        orderId: order1._id,
        comment: "I am very pleased with this product",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Create Another Review", async () => {
    const res = await request(app)
      .post("/public/review/create") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        productId,
        rating: 6,
        orderId: order2._id,
        comment: "This product was great",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("List Reviews", async () => {
    const res = await request(app)
      .post(`/public/review/list?productId=${productId}`) //
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    res.body.size.should.equal(2);
    res.body.average.should.equal(5);
  });

  it("Confirm Product Removed from pending", async () => {
    const res = await request(app)
      .post("/public/review/getPending") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    res.body.length.should.equal(2);
  });
});
