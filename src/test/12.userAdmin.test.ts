import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:userAdmin.test");

chai.should();

describe("User Admin Test", async () => {
  it("Get User List", async () => {
    const res = await request(app) //
      .get("/admin/user/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });
});
