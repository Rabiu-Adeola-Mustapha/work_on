import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:shipSettingAdmin.test");

chai.should();

let hongKong: { id: string; name: string } = null;
let taiwan: { id: string; name: string } = null;

const shipSetting = {
  countryIds: [] as string[],
  // countryIds: [hongKong.id],
  options: [
    {
      shipType: "basic",
      name: "Flat Shipping",
      feeOptions: [
        {
          name: { en: "Flat Rate" },
          feeType: "flat",
          setting: {
            flat: 100,
          },
        },
      ],
    },
    {
      shipType: "basic",
      name: "Flat Shipping",
      feeOptions: [
        {
          name: { en: "Free Above $300" },
          feeType: "free",
          setting: {
            flat: 100,
            freeAmtAbove: 300,
          },
        },
      ],
    },
  ],
};

async function add(data: any) {
  const res = await request(app)
    .post("/admin/shipSetting/add")
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .send(data);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return res;
}

async function listShipSettings() {
  const res = await request(app)
    .get("/admin/shipSetting/list")
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("locale", "en");

  res.status.should.equal(200);
  return res;
}

describe("Country List", () => {
  it("Get Country List", async () => {
    const res = await request(app)
      .get("/admin/shipSetting/countryList")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    res.status.should.equal(200);
    hongKong = (res.body as any[]).find((c) => c.name === "Hong Kong SAR");
    taiwan = (res.body as any[]).find((c) => c.name === "Taiwan");
    shipSetting.countryIds.push(hongKong.id);
  });
});

describe("Ship Setting Test", () => {
  let list: any = null;

  it("Sanitize - Free type should not have amtAbove", async () => {
    let res = await add({
      countryIds: [hongKong.id, taiwan.id],
      options: [
        {
          name: "Basic Option",
          shipType: "basic",
          feeOptions: [
            { name: { en: "Flat Shipping $30" }, feeType: "flat", setting: { flat: "30", amtAbove: "0" } },
            {
              name: { en: "Free Shipping" },
              feeType: "free",
              setting: { flat: "", amtAbove: "", freeAmtAbove: "500" },
            },
          ],
        },
      ],
    });

    res = await listShipSettings();
    // debug("sanitize", util.inspect(res.body, true, 9999, true));
    (res.body[0].options[0].feeOptions[1].setting.amtAbove === undefined).should.be.true;
    res.body[0].options[0].name.should.equal("Basic Option");

    res = await request(app)
      .post("/admin/shipSetting/delete")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({ id: res.body[0].id });

    res.status.should.equal(200);
  });

  it("Add Hong Kong - Flat Fee", async () => {
    const res = await request(app)
      .post("/admin/shipSetting/add")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send(shipSetting);

    res.status.should.equal(200);
  });

  it("List", async () => {
    const res = await request(app)
      .get("/admin/shipSetting/list")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    res.status.should.equal(200);

    res.body.length.should.equal(1);
    (res.body[0].id !== undefined).should.be.true;
    list = res.body;

    // debug("List", util.inspect(res.body, true, 9999, true));
  });

  it("Update", async () => {
    // debug("id", list[0].id);
    const res = await request(app)
      .post("/admin/shipSetting/update")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        id: list[0].id,
        countryIds: [hongKong.id],
        options: [
          {
            shipType: "basic",
            name: "Flat Shipping",
            feeOptions: [
              {
                name: { en: "Flat Rate" },
                feeType: "flat",
                setting: {
                  flat: 1000,
                },
              },
            ],
          },
          {
            shipType: "basic",
            name: "Flat Shipping",
            feeOptions: [
              {
                name: { en: "Free Above $300" },
                feeType: "free",
                setting: {
                  flat: 1000,
                  freeAmtAbove: 3000,
                },
              },
            ],
          },
        ],
      });

    if (res.error) console.log(res.error);
    res.status.should.equal(200);
  });

  it("Verify Update", async () => {
    const res = await request(app)
      .get("/admin/shipSetting/list")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.log(res.error);
    res.status.should.equal(200);

    res.body[0].options[0].feeOptions[0].setting.flat.should.equal(1000);
  });

  it("Delete", async () => {
    const res = await request(app)
      .post("/admin/shipSetting/delete")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({ id: list[0].id });

    res.status.should.equal(200);
  });

  it("List Again - Should Return Empty Array", async () => {
    const res = await request(app)
      .get("/admin/shipSetting/list")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    res.status.should.equal(200);

    res.body.length.should.equal(0);
  });
});

interface SubDistrict {
  id: string;
  region: string;
  district: string;
  subDistrict: string;
}

describe("Sub District Extra Charge", () => {
  let subDistrict1: SubDistrict;
  let subDistrict2: SubDistrict;
  let shipSettingId: string;

  it("Get Sub District List", async () => {
    const res = await request(app)
      .get("/admin/shipSetting/hkSubdistricts")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    res.status.should.equal(200);
    subDistrict1 = res.body[0];
    subDistrict2 = res.body[1];
  });

  it("Add Ship Setting", async () => {
    const shipSettingSubDistrict: typeof shipSetting = JSON.parse(JSON.stringify(shipSetting));

    (shipSettingSubDistrict.options[0] as any).hkSubDistrictCharges = [
      {
        hkRegionId: subDistrict1.id,
        charge: 10,
      },
      {
        hkRegionId: subDistrict2.id,
        charge: 20,
      },
    ];

    const res = await request(app)
      .post("/admin/shipSetting/add")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send(shipSettingSubDistrict);

    if (res.error) console.log(res.error);
    res.status.should.equal(200);
  });

  it("Verify Added", async () => {
    const res = await request(app)
      .get("/admin/shipSetting/list")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.log(res.error);
    res.status.should.equal(200);

    shipSettingId = res.body[0].id;
    res.body[0].options[0].hkSubDistrictCharges.length.should.equal(2);

    res.body[0].options[0].hkSubDistrictCharges[0].hkRegionId.should.equal(subDistrict1.id);
    res.body[0].options[0].hkSubDistrictCharges[0].charge.should.equal(10);

    res.body[0].options[0].hkSubDistrictCharges[1].hkRegionId.should.equal(subDistrict2.id);
    res.body[0].options[0].hkSubDistrictCharges[1].charge.should.equal(20);
  });

  it("Update", async () => {
    const shipSettingSubDistrict: typeof shipSetting = JSON.parse(JSON.stringify(shipSetting));

    (shipSettingSubDistrict.options[0] as any).hkSubDistrictCharges = [
      {
        hkRegionId: subDistrict1.id,
        charge: 100,
      },
      {
        hkRegionId: subDistrict2.id,
        charge: 20,
      },
    ];

    const res = await request(app)
      .post("/admin/shipSetting/update")
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        id: shipSettingId,
        ...shipSettingSubDistrict,
      });

    if (res.error) console.log(res.error);
    res.status.should.equal(200);
  });

  it("Verify Update", async () => {
    const res = await request(app)
      .get(`/admin/shipSetting/single?id=${shipSettingId}`)
      .set("x-access-token", testData.userIsa.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("locale", "en");

    if (res.error) console.log(res.error);
    res.status.should.equal(200);

    res.body.options[0].hkSubDistrictCharges[0].hkRegionId.should.equal(subDistrict1.id);
    res.body.options[0].hkSubDistrictCharges[0].charge.should.equal(100);
  });
});
