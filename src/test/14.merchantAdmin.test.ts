import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import AdminUserModel from "../models/adminUser.model";
import MerchantModel from "../models/merchant.model";
import { userRegistrationVerify } from "./02.shopAdmin.test";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:shopMerchantAdmin.test");

chai.should();

describe("Shop Merchant Admin Test", async () => {
  it("Create Merchant - Not Shop Admin - Not Allow)", async () => {
    const res = await request(app)
      .post("/admin/merchant/create")
      .set("x-access-token", testData.userIsa.token)
      .send({
        shopId: testData.daydaybuy.doc._id,
        name: { en: "My Wine" },
      });

    res.status.should.equal(401);
  });

  it("Create Merchant - MyWine", async () => {
    const res = await request(app)
      .post("/admin/merchant/create")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.daydaybuy.doc._id)
      .send({
        name: { en: "My Wine" },
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    testData.mywine.doc = await MerchantModel.findById(res.body.merchantId).lean();
  });

  let list = null as any;

  it("List Merchants", async () => {
    const res = await request(app)
      .get("/admin/merchant/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.daydaybuy.doc._id)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    // debug("List Merchants", res.body);
    res.body.length.should.equal(1);
    res.body[0].name.should.equal("My Wine");

    list = res.body;
  });

  it("Invite User To It", async () => {
    const res = await request(app)
      .post("/admin/merchant/addUser")
      .set("x-access-token", testData.userJason.token)
      .set("merchant-id", testData.mywine.doc._id)
      .send({
        email: "mywineAdmin@abc.com",
        type: "merchantAdmin",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Invite User To It (merchant id in body)", async () => {
    // admin uses this because they don't actually select merchant id

    const res = await request(app)
      .post("/admin/merchant/addUser")
      .set("x-access-token", testData.userJason.token)
      .send({
        email: "mywineAdmin@abc.com",
        type: "merchantAdmin",
        merchantId: testData.mywine.doc._id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Get Single Merchant", async () => {
    const res = await request(app)
      .get(`/admin/merchant/single?merchantId=${list[0].id as string}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.daydaybuy.doc._id);

    // debug("Single", res.body);
    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("mywinadmin Register", async () => {
    const user = await AdminUserModel.findOne({ email: "mywineAdmin@abc.com" }).lean();
    await userRegistrationVerify(user, "mypassWord@1817!!");

    testData.userMyWine.doc = user;

    // login

    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "mywineAdmin@abc.com",
        password: "mypassWord@1817!!",
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;
    testData.userMyWine.token = res.body.token;
  });

  it("Get Shop (My Wine Admin)", async () => {
    const res = await request(app) //
      .get("/admin/shop/list")
      .set("x-access-token", testData.userMyWine.token);

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.length.should.equal(1);

    (res.body[0].shopRole === undefined).should.be.true;

    res.body[0].userMerchantRole.should.equal("merchantAdmin");
  });
});
