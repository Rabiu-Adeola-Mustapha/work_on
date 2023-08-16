import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:31.adminReward.test");

describe("Admin Reward Test - Global", () => {
  it("Enable Reward", async () => {
    let res = await request(app)
      .post("/admin/shop/update")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        rewardPayout: 0.03,
      });

    res.status.should.equal(200);

    res = await request(app)
      .get("/admin/shop/get")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);
    res.status.should.equal(200);

    res.body.rewardPayout.should.equal(0.03);
  });
});

describe("Admin Reward Test - Category", () => {
  let catId: number = null;

  it("Set Reward Payout to Category", async () => {
    let res = await request(app)
      .get("/admin/category/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    res.status.should.equal(200);

    catId = res.body[0].id;

    res = await request(app)
      .post("/admin/category/edit")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        ...res.body[0],
        rewardPayout: 0.05,
        parentId: res.body[0].parentId ?? undefined,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Check if reward payout is set in category", async () => {
    const res = await request(app)
      .get(`/admin/category/get?id=${catId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    res.status.should.equal(200);
    res.body.rewardPayout.should.equal(0.05);
  });
});

describe("Admin Reward Test - Product", () => {
  let productId: number = null;

  it("Set Reward Payout to Product", async () => {
    let res = await request(app)
      .get("/admin/product/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    res.status.should.equal(200);

    productId = res.body[0].id;

    res = await request(app)
      .post("/admin/product/update")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        ...res.body[0],
        productId,
        rewardPayout: 0.08,
      });

    res.status.should.equal(200);
  });

  it("Verify Reward Payout In Product", async () => {
    const res = await request(app)
      .get(`/admin/product/get?productId=${productId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    res.status.should.equal(200);
    res.body.rewardPayout.should.equal(0.08);
  });
});
