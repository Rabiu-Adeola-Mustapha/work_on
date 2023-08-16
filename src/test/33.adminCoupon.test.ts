import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:33.adminCoupon.test");

describe("Coupon Test", () => {
  let couponId: string;

  it("Create Coupon", async () => {
    const res = await request(app)
      .post("/admin/coupon/create")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        type: "fixed",
        amount: "200",
        usageLimit: 1,
        expirationDate: "1 days",
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    couponId = res.body._id;
  });

  it("List Coupons", async () => {
    const res = await request(app)
      .get("/admin/coupon/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.length.should.equal(1);
  });

  it("Get Single Coupon", async () => {
    const res = await request(app) //
      .get(`/admin/coupon/get?couponId=${couponId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body._id.should.equal(couponId);
  });

  it("Update Coupon", async () => {
    const res = await request(app) //
      .post(`/admin/coupon/edit?couponId=${couponId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        usageLimit: 2,
        expirationDate: "1 days",
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.usageLimit.should.equal(2);
  });
});
