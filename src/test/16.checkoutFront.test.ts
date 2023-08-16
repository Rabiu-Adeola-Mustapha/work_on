import Debug from "debug";
import request from "supertest";

import app from "../app";
import ProductModel, { ProductDocLean } from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:16.checkoutFront.test");

describe("Checkout Test", () => {
  let sessionId: string;
  let product: ProductDocLean;

  before(async () => {
    product = await ProductModel.findOne({
      shop_id: testData.shopAtilio.doc._id,
      name: { $exists: true },
    }).lean();
  });

  it("Create Checkout Session", async () => {
    debug("product", product);
    const res = await request(app)
      .post("/public/checkout/createSession")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        items: [
          {
            productId: product._id,
            quantity: 1,
          },
        ],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.id !== undefined).should.be.true;
    sessionId = res.body.id;
  });

  it("Get Session", async () => {
    const res = await request(app)
      .get(`/public/checkout/getSession?id=${sessionId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    res.status.should.equal(200);
    res.body.id.should.equal(sessionId);
    res.body.items.length.should.equal(1);

    debug("getSession", res.body.items[0].product);
    res.body.items[0].product.name.should.equal(product.name.en);
    res.body.items[0].quantity.should.equal(1);
    res.body.items[0].price.should.equal(product.price);

    (res.body.total.shipping === null).should.be.true;
  });
});
