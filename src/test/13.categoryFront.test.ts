import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:categoryFront.test");

describe("Category Front Test", () => {
  it("List Level 1 Categories", async () => {
    const res = await request(app) //
      .get("/public/category/list")
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equals(200);

    res.body.length.should.equal(2);

    (res.body[0].children === undefined).should.be.true;
    (res.body[1].children === undefined).should.be.true;
  });

  it("List P1 and C1 has child", async () => {
    // codes
    // level
    const res = await request(app)
      .get("/public/category/list?codes[]=p1&deep=1")
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(1);
    res.body[0].children.length.should.equal(1);
  });
});
