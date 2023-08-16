import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:22.paySettingAdmin.test");

async function add(data: any) {
  const res = await request(app)
    .post("/admin/paySetting/add")
    .send(data)
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
}

async function list() {
  const res = await request(app)
    .get("/admin/paySetting/list")
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
  return res.body;
}

async function update(data: any) {
  const res = await request(app)
    .post("/admin/paySetting/update")
    .send(data)
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
}

async function single(id: string) {
  const res = await request(app)
    .get(`/admin/paySetting/single?id=${id}`)
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return res.body;
}

async function deleteRecord(id: string) {
  const res = await request(app)
    .post(`/admin/paySetting/delete`)
    .send({ id })
    .set("x-access-token", testData.userIsa.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
}

describe("Pay Setting Test", () => {
  let paySettings: any[];

  it("Add Pay Setting", async () => {
    await add({
      payType: "cod",
      name: {
        en: "COD",
      },
      setting: {
        message: { en: "Pay this by above PayMe QR Code" },
        qrCode: "https://qr.payme.hsbc.com.hk/1/WCHc8uGsjoewrt5p8v1JR6",
      },
    });

    await add({
      payType: "paypal",
      name: {
        en: "Paypal",
      },
      setting: {
        key: "WERWEJKRJEWRKWR",
      },
    });
  });

  it("List", async () => {
    paySettings = await list();
    paySettings.length.should.equal(2);

    // debug("list", paySettings);
  });

  it("Update", async () => {
    const item = paySettings[0];
    await update({
      id: item.id,
      payType: item.payType,
      setting: {
        message: { en: "New message" },
        qrCode: "https://qr.payme.hsbc.com.hk/1/WCHc8uGsjoewrt5p8v1JR6",
      },
    });
  });

  it("Single", async () => {
    const item = await single(paySettings[0].id);
    item.setting.message.en.should.equal("New message");
  });

  it("Delete", async () => {
    await deleteRecord(paySettings[1].id);
    (await list()).length.should.equal(1);
  });
});
