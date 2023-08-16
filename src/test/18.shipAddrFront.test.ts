import Debug from "debug";
import request from "supertest";

import app from "../app";
import CountryModel from "../models/country.model";
import HkRegionModel, { HkRegionDocLean } from "../models/hkRegion.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:shipAddrFront.test");

async function getAddresses() {
  const res = await request(app)
    .get("/public/user/shipAddrs")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .set("locale", "en");

  res.status.should.equal(200);
  return res;
}

describe("Address Test", () => {
  let addressId: string;
  let apLeiChau: HkRegionDocLean;
  let kowloonTong: HkRegionDocLean;

  before(async () => {
    apLeiChau = await HkRegionModel.findOne({
      "sub_district.en": "Ap Lei Chau",
    }).lean();

    kowloonTong = await HkRegionModel.findOne({ "sub_district.en": "Kowloon Tong" }).lean();
  });

  it("Adds Address", async () => {
    const res = await request(app)
      .post("/public/user/addShipAddr")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        recipientName: "Favour Okenana",
        telCountryCode: "852",
        tel: "92608630",
        countryCode: "852",
        // region: "新界", // NT, HK, KL
        // district: "荃灣區",
        address: "萬景峯1座19樓B室 (Address 1)", // street, building, flat
        subDistrictId: apLeiChau._id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    const addrRes = await getAddresses();
    addressId = addrRes.body[0].id;
    addrRes.body[0].isDefault.should.equal(true);
    addrRes.body[0].region.should.equal("Hong Kong");
    addrRes.body[0].district.should.equal("Southern");
    addrRes.body[0].subDistrict.should.equal("Ap Lei Chau");
  });

  it("Add Another Address", async () => {
    const res = await request(app)
      .post("/public/user/addShipAddr")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        recipientName: "Jason Ching",
        telCountryCode: "852",
        tel: "92608630",
        countryCode: "852",
        // region: "新界", // NT, HK, KL
        // district: "荃灣區",
        address: "萬景峯1座19樓B室 (Address 2)", // street, building, flat
        subDistrictId: apLeiChau._id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    const addrRes = await getAddresses();
    addrRes.body[0].isDefault.should.equal(false);
    addrRes.body[1].isDefault.should.equal(true);
  });

  it("Updates Address", async () => {
    const res = await request(app)
      .post(`/public/user/updateShipAddr?id=${addressId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        recipientName: "Hugo Siu",
        telCountryCode: "852",
        tel: "92608630",
        countryCode: "852",
        // region: "新界", // NT, HK, KL
        // district: "荃灣區",
        address: "萬景峯1座19樓B室 (Updated Address 1)", // street, building, flat
        isDefault: true,
        subDistrictId: kowloonTong._id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const addrRes = await getAddresses();
    // debug("addrRes", addrRes.body);
    addrRes.body[0].isDefault.should.equal(true);
    addrRes.body[0].recipientName.should.equal("Hugo Siu");
    addrRes.body[0].region.should.equal("Kowloon");
    addrRes.body[0].district.should.equal("Kowloon City");
    addrRes.body[0].subDistrict.should.equal("Kowloon Tong");
    addrRes.body[1].isDefault.should.equal(false);
  });

  it("Get Addresses", async () => {
    const res = await request(app)
      .get("/public/user/shipAddrs")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    res.body.length.should.equal(2);

    res.body[0].countryName.should.equal("Hong Kong SAR");
  });

  it("Deletes Address", async () => {
    const res = await request(app)
      .post(`/public/user/deleteShipAddr?id=${addressId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    const addrRes = await getAddresses();
    addrRes.body.length.should.equal(1);
    // after deleting default address, ensure the first address is set as default
    addrRes.body[0].isDefault.should.equal(true);
  });
});

describe("SF Address Test", () => {
  it("Get Regions and Districts", async () => {
    const res = await request(app)
      .get("/public/ship/sfSubDistricts")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.length > 10).should.be.true;
    (res.body[0].key !== undefined).should.be.true;

    // debug("districts", res.body);
  });

  it("Get Locations from Sub District", async () => {
    const encodedAdmiraltyString = encodeURIComponent("金鍾");

    const res = await request(app)
      .get(`/public/ship/sfLocations?subDistrict=${encodedAdmiraltyString}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.length > 0).should.be.true;
  });
});

describe("Store Pickup", () => {
  it("Get List", async () => {
    const res = await request(app)
      .get("/public/ship/pickupAddrs")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.length === 2).should.be.true;
    (res.body[0].id !== undefined).should.be.true;
  });

  it("Get List - Country Specific", async () => {
    const hongKong = await CountryModel.findOne({
      "name.en": "Hong Kong SAR",
    }).lean();

    const res = await request(app)
      .get(`/public/ship/pickupAddrs?countryId=${hongKong._id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.length === 1).should.be.true;
    (res.body[0].id !== undefined).should.be.true;
    res.body[0].addr.should.equal("Shop 1029-30, 1/F, IFC, 1 Harbour View Street, Central");
  });
});
