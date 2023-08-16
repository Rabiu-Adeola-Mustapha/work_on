import Debug from "debug";
import request from "supertest";

import app from "../app";
import CountryModel from "../models/country.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:23.payOptionFront.test");

describe("Pay Option Test", () => {
  it("Get Pay Options", async () => {
    const hongKong = await CountryModel.findOne({ iso: "HK" }).lean();
    const hkId = hongKong._id.toString() as string;

    const res = await request(app)
      .get(`/public/pay/options?countryId=${hkId}&shipType=sf`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(1);
  });
});
