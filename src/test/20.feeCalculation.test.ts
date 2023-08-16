import Debug from "debug";
import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import CountryModel, { CountryDocLean } from "../models/country.model";
import HkRegionModel, { HkRegionDocLean } from "../models/hkRegion.model";
import ProductModel from "../models/product.model";
import ShipSettingModel, { ShipSettingDocLean } from "../models/shipSetting.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:20.feeCalculation.test");

async function setShipSetting(shipSetting: any) {
  await ShipSettingModel.deleteMany();

  const res = await request(app)
    .post("/admin/shipSetting/add")
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .send(shipSetting);

  res.status.should.equal(200);
  //   debug(res.body);
}

async function getShipSetting(country: CountryDocLean): Promise<ShipSettingDocLean[]> {
  const countryId = country._id.toString() as string;

  const res = await request(app)
    .get(`/public/ship/settings?countryId=${countryId}`)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token);

  res.status.should.equal(200);
  return res.body;
}

async function createSession(priceList: Array<{ price: number; quantity: number }>) {
  const products = await ProductModel.find({ shop_id: testData.shopAtilio.doc._id }).limit(priceList.length).lean();

  for (let i = 0; i < priceList.length; i++) {
    await ProductModel.findOneAndUpdate(
      {
        _id: products[i]._id,
      },
      {
        $set: {
          price: priceList[i].price,
        },
      }
    );
  }

  const items = priceList.map((p, idx) => {
    return {
      productId: products[idx]._id,
      quantity: p.quantity,
    };
  });

  const res = await request(app)
    .post("/public/checkout/createSession")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send({
      items,
    });

  res.status.should.equal(200);
  const sessionId = res.body.id;
  return sessionId;
}

async function calculateShipping(
  sessionId: string,
  country: CountryDocLean,
  hkRegion?: HkRegionDocLean
): Promise<
  Array<{
    feeName: string;
    fee: number;
    extraFee: number;
    eligible: boolean;
    status: "regular" | "missingHkRegionId" | "extraFeeAdded";
  }>
  // eslint-disable-next-line
> {
  const countryId = country._id.toString() as string;

  let url = `/public/checkout/calculateShipping?sessionId=${sessionId}&countryId=${countryId}`;

  if (hkRegion) {
    const hkRegionId = hkRegion._id.toString() as string;
    url = `/public/checkout/calculateShipping?sessionId=${sessionId}&countryId=${countryId}&hkRegionId=${hkRegionId}`;
  }

  const res = await request(app)
    .get(url)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .set("locale", "en");

  res.status.should.equal(200);
  return res.body;
}

interface TotalRes {
  shipping: number;
  shippingExtra?: number;
  userRewardPoints?: number;
  tax: number;
  itemsTotal: number;
  total: number;
}

async function calculateTotal(
  sessionId: string,
  country: CountryDocLean,
  shipOptionId: mongoose.Types.ObjectId,
  hkRegion?: HkRegionDocLean
): Promise<TotalRes> {
  // eslint-disable-next-line
  const countryId = country._id.toString() as string;
  const shipOptionIdString = shipOptionId.toString();

  let url = `/public/checkout/calculateTotal?sessionId=${sessionId}&shipOptionId=${shipOptionIdString}&countryId=${countryId}`;

  if (hkRegion) {
    const hkRegionId = hkRegion._id.toString() as string;
    url = `/public/checkout/calculateTotal?sessionId=${sessionId}&shipOptionId=${shipOptionIdString}&countryId=${countryId}&hkRegionId=${hkRegionId}`;
  }

  const res = await request(app)
    .get(url)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .set("locale", "en");

  res.status.should.equal(200);
  return res.body;
}

describe("Shipping Fee Calculation Test", () => {
  let hongKong = null as CountryDocLean;
  let localExpressId = null as mongoose.Types.ObjectId;
  let sfLockerId = null as mongoose.Types.ObjectId;
  let sfExpressId = null as mongoose.Types.ObjectId;

  before(async () => {
    hongKong = await CountryModel.findOne({ iso: "HK" }).lean();

    const shipSetting = {
      countryIds: [hongKong._id],
      options: [
        {
          shipType: "basic",
          name: "Local Express",
          feeOptions: [
            {
              name: { en: "Flat $20" },
              feeType: "flat",
              setting: {
                flat: 20,
                amtAbove: 0,
              },
            },
            {
              name: { en: "Flat $10" },
              feeType: "flat",
              setting: {
                flat: 10,
                amtAbove: 50,
              },
            },
            {
              name: { en: "Free" },
              feeType: "free",
              setting: {
                freeAmtAbove: 100,
              },
            },
          ],
        },
        {
          _id: sfLockerId,
          shipType: "sf",
          name: "SF Locker",
          feeOptions: [
            {
              name: { en: "SF Locker $35" },
              feeType: "flat",
              setting: {
                flat: 35,
                amtAbove: 0,
              },
            },
            {
              name: { en: "SF Locker $20" },
              feeType: "flat",
              setting: {
                flat: 20,
                amtAbove: 50,
              },
            },
            {
              name: { en: "Free" },
              feeType: "free",
              setting: {
                freeAmtAbove: 100,
              },
            },
          ],
        },
        {
          shipType: "basic",
          name: "SF Express",
          feeOptions: [
            {
              name: { en: "SF Express Flat" },
              feeType: "flat",
              setting: {
                flat: 40,
                amtAbove: 0,
              },
            },
            {
              name: { en: "Free" },
              feeType: "free",
              setting: {
                freeAmtAbove: 200,
              },
              excludeHkSubDistrictCharge: true, // means that this remains fee, no extra charge is added for apLeiChau
            },
          ],
        },
      ],
    };
    await setShipSetting(shipSetting);
    const settings = await getShipSetting(hongKong);
    const optionsArray = settings.flatMap((o: any) => o.options);
    localExpressId = optionsArray.find((o) => o.name === "Local Express").id;
    sfLockerId = optionsArray.find((o) => o.name === "SF Locker").id;
    sfExpressId = optionsArray.find((o) => o.name === "SF Express").id;
  });

  it("Get Shipping Country", async () => {
    const res = await request(app)
      .get("/public/shop/shippingCountries")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .set("locale", "en");

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(1);
    res.body[0].code.should.equal("852");
  });

  it("Shipping Very Low Amoumt", async () => {
    const sessionId = await createSession([{ price: 9, quantity: 1 }]);

    const fee = await calculateShipping(sessionId, hongKong);
    fee.length.should.equal(8);

    const eligibleFees = fee.filter((f) => f.eligible);

    eligibleFees.length.should.equal(3);
    eligibleFees[0].feeName.should.equal("Flat $20");
    eligibleFees[0].fee.should.equal(20);
    eligibleFees[0].status.should.equal("regular");
    eligibleFees[1].feeName.should.equal("SF Locker $35");
    eligibleFees[1].fee.should.equal(35);
    eligibleFees[1].status.should.equal("regular");
  });

  it("Middle Shipping - Return The best eligible and all non-eligible", async () => {
    const sessionId = await createSession([{ price: 60, quantity: 1 }]);

    const fee = await calculateShipping(sessionId, hongKong);
    fee.length.should.equal(6);

    const eligibleFees = fee.filter((f) => f.eligible);

    eligibleFees[0].feeName.should.equal("Flat $10");
    eligibleFees[0].fee.should.equal(10);
    eligibleFees[0].status.should.equal("regular");

    eligibleFees[1].fee.should.equal(20);
    eligibleFees[1].status.should.equal("regular");
  });

  it("Local Express", async () => {
    const sessionId = await createSession([
      { price: 100, quantity: 1 },
      { price: 150, quantity: 2 },
    ]);

    const fee = await calculateShipping(sessionId, hongKong);

    fee.length.should.equal(3);
    fee[1].feeName.should.equal("Free");
    fee[1].fee.should.equal(0);
    fee[1].status.should.equal("regular");
  });

  it("Calculate Total Fee Local Express", async () => {
    const sessionId = await createSession([{ price: 300, quantity: 1 }]);
    const total = await calculateTotal(sessionId, hongKong, localExpressId);
    total.itemsTotal.should.equal(300);
    total.shipping.should.equal(0);
    total.total.should.equal(300);
    total.tax.should.equal(0);
  });

  it("Calculate Total Fee SF Express ", async () => {
    const sessionId = await createSession([{ price: 150, quantity: 1 }]);
    const total = await calculateTotal(sessionId, hongKong, sfExpressId);
    total.itemsTotal.should.equal(150);
    total.shipping.should.equal(40);
    total.total.should.equal(190);
    total.tax.should.equal(0);
  });

  it("Calculate Total Fee Sf Locker Flat", async () => {
    const sessionId = await createSession([{ price: 70, quantity: 1 }]);
    const total = await calculateTotal(sessionId, hongKong, sfLockerId);
    total.itemsTotal.should.equal(70);
    total.shipping.should.equal(20);
    total.total.should.equal(90);
    total.tax.should.equal(0);
  });
});

describe("Fee Calculation Test - SubDistrict Extra Fee", () => {
  let hongKong = null as CountryDocLean;
  let apLeiChau = null as HkRegionDocLean;
  let wanChai = null as HkRegionDocLean;
  let localExpressId = null as mongoose.Types.ObjectId;

  before(async () => {
    hongKong = await CountryModel.findOne({ iso: "HK" }).lean();
    localExpressId = new mongoose.Types.ObjectId();

    apLeiChau = await HkRegionModel.findOne({
      "sub_district.en": "Ap Lei Chau",
    }).lean();

    wanChai = await HkRegionModel.findOne({
      "sub_district.en": "Wan Chai",
    }).lean();

    const shipSetting = {
      countryIds: [hongKong._id],
      options: [
        {
          _id: localExpressId,
          shipType: "basic",
          name: "Local Express",
          feeOptions: [
            {
              name: { en: "Flat $20" },
              feeType: "flat",
              setting: {
                flat: 20,
                amtAbove: 0,
              },
            },
            {
              name: { en: "Flat $10" },
              feeType: "flat",
              setting: {
                flat: 10,
                amtAbove: 50,
              },
            },
            {
              name: { en: "Free" },
              feeType: "free",
              setting: {
                freeAmtAbove: 100,
              },
              excludeHkSubDistrictCharge: true, // means that this remains fee, no extra charge is added for apLeiChau
            },
          ],
          hkSubDistrictCharges: [
            {
              hkRegionId: apLeiChau._id,
              charge: 88,
            },
          ],
        },
        {
          shipType: "sf",
          name: "SF Locker",
          feeOptions: [
            {
              name: { en: "SF Locker $35" },
              feeType: "flat",
              setting: {
                flat: 35,
                amtAbove: 0,
              },
            },
            {
              name: { en: "SF Locker $20" },
              feeType: "flat",
              setting: {
                flat: 20,
                amtAbove: 50,
              },
            },
            {
              name: { en: "Free" },
              feeType: "free",
              setting: {
                freeAmtAbove: 100,
              },
            },
          ],
        },
        {
          shipType: "basic",
          name: "SF Express",
          feeOptions: [
            {
              name: { en: "SF Express Flat" },
              feeType: "flat",
              setting: {
                flat: 20,
                amtAbove: 0,
              },
            },
            {
              name: { en: "Free" },
              feeType: "free",
              setting: {
                freeAmtAbove: 100,
              },
              excludeHkSubDistrictCharge: true, // means that this remains fee, no extra charge is added for apLeiChau
            },
          ],
        },
      ],
    };

    await setShipSetting(shipSetting);
    const settings = await getShipSetting(hongKong);
    const optionsArray = settings.flatMap((o: any) => o.options);
    localExpressId = optionsArray.find((o) => o.name === "Local Express").id;
  });

  it("Shipping No SubDistrict - Can't Calculate", async () => {
    const sessionId = await createSession([{ price: 9, quantity: 1 }]);

    const fee = await calculateShipping(sessionId, hongKong);
    fee.length.should.equal(8);

    const eligibleFees = fee.filter((f) => f.eligible);

    eligibleFees.length.should.equal(3);
    eligibleFees[0].feeName.should.equal("Flat $20");
    (eligibleFees[0].fee === undefined).should.be.true;
    eligibleFees[0].status.should.equal("missingHkRegionId");
    eligibleFees[1].feeName.should.equal("SF Locker $35");
    eligibleFees[1].fee.should.equal(35);
  });

  it("Shipping Ap Lei Chau - Extra is Added", async () => {
    const sessionId = await createSession([{ price: 9, quantity: 1 }]);

    const fee = await calculateShipping(sessionId, hongKong, apLeiChau);
    fee.length.should.equal(8);

    const eligibleFees = fee.filter((f) => f.eligible);

    eligibleFees.length.should.equal(3);
    eligibleFees[0].feeName.should.equal("Flat $20");
    eligibleFees[0].fee.should.equal(20);
    eligibleFees[0].extraFee.should.equal(88);
    eligibleFees[0].status.should.equal("extraFeeAdded");
    eligibleFees[1].feeName.should.equal("SF Locker $35");
    eligibleFees[1].fee.should.equal(35);
  });

  it("Shipping Wan Chai - No Extra is Added", async () => {
    const sessionId = await createSession([{ price: 9, quantity: 1 }]);

    const fee = await calculateShipping(sessionId, hongKong, wanChai);
    fee.length.should.equal(8);

    const eligibleFees = fee.filter((f) => f.eligible);

    eligibleFees.length.should.equal(3);
    eligibleFees[0].feeName.should.equal("Flat $20");
    eligibleFees[0].fee.should.equal(20);
    eligibleFees[1].feeName.should.equal("SF Locker $35");
    eligibleFees[1].fee.should.equal(35);
  });

  it("Local Express", async () => {
    const sessionId = await createSession([
      { price: 100, quantity: 1 },
      { price: 150, quantity: 2 },
    ]);

    const fee = await calculateShipping(sessionId, hongKong, apLeiChau);

    fee.length.should.equal(3);
    fee[1].feeName.should.equal("Free");
    fee[1].fee.should.equal(0);
  });

  it("Total Ap Lei Chau - Extra is Added", async () => {
    const sessionId = await createSession([{ price: 9, quantity: 1 }]);

    const total = await calculateTotal(sessionId, hongKong, localExpressId, apLeiChau);
    total.itemsTotal.should.equal(9);
    total.shipping.should.equal(20);
    total.shippingExtra.should.equal(88);
    total.total.should.equal(117);
    total.tax.should.equal(0);
  });
});
