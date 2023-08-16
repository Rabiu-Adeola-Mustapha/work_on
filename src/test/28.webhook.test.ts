import Debug from "debug";
import request from "supertest";

import app from "../app";
import CountryModel from "../models/country.model";
import PaySettingModel from "../models/paySetting.model";
import ProductModel from "../models/product.model";
import ShipSettingModel from "../models/shipSetting.model";
import UserModel from "../models/user.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:28.webhook.test");

async function getCartId() {
  const res = await request(app) //
    .get("/public/cart/getId")
    .set("shop-id", testData.shopAtilio.doc._id);

  return res.body.cartId;
}

async function getPayOption(paymentType: string) {
  const payOption = await PaySettingModel.create({
    shopId: testData.shopAtilio.doc._id,
    payType: paymentType,
    name: { en: paymentType.toUpperCase() },
    setting: {
      message: { en: "message" },
      qrCode: "",
    },
    isActive: true,
  });
  return payOption._id;
}

async function addToCart(productId: string): Promise<string> {
  const cartId = await getCartId();
  await request(app)
    .post("/public/cart/addProduct") //
    .set("shop-id", testData.shopAtilio.doc._id)
    .send({
      cartId,
      productId,
      quantity: 1,
    });

  return cartId;
}

async function createOrder(paymentType: string) {
  const product = await ProductModel.findOne({
    shop_id: testData.shopAtilio.doc._id,
    name: { $exists: true },
  }).lean();

  const hongKong = await CountryModel.findOne({ iso: "HK" }).lean();
  const hongKongId = hongKong._id.toString() as string;
  const shipSetting = await ShipSettingModel.findOne({ "options.shipType": "basic" });
  const shipOption = shipSetting.options[0];
  const payOptionId = await getPayOption(paymentType);
  const user = await UserModel.findOne({ _id: testData.front.userJason.doc._id });
  const addrId = user.ship_addrs[0]._id;

  const data = {
    countryId: hongKongId,
    shipping: 10,
    itemsTotal: 102,
    taxTotal: 10,
    total: 112,
    currency: "HKD",
    shipType: shipOption.shipType,
    shipName: shipOption.name,
    shipId: shipOption._id,
    addrType: "regular",
    paymentId: payOptionId,
    shipAddrId: addrId,
    items: [{ productId: product._id, quantity: 1 }],
  };

  const cartId = await addToCart(product._id);

  const res = await request(app)
    .post("/public/order/createOrder")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send({ ...data, cartId });
  if (res.error) console.error(res.error);
  return res.body.id;
}

async function getOrder(orderId: string) {
  const res = await request(app) //
    .get(`/public/order/single/${orderId}`)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
  return res;
}

describe("Webhook Test", () => {
  let stripeOrderId: string;
  let paypalOrderId: string;
  let codOrderId: string;

  before(async () => {
    stripeOrderId = await createOrder("stripe");
    paypalOrderId = await createOrder("paypal");
    codOrderId = await createOrder("cod");
  });

  it("Test Stripe Webhook", async () => {
    const res = await request(app)
      .post(`/public/webhook/stripeWebhook?shopId=${testData.shopAtilio.doc._id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        source: "test",
        created: Math.floor(new Date().getTime() / 1000),
        data: {
          object: { client_reference_id: stripeOrderId },
        },
        type: "checkout.session.completed",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Test Paypal Webhook", async () => {
    const res = await request(app)
      .post(`/public/webhook/paypalWebhook?shopId=${testData.shopAtilio.doc._id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        source: "test",
        create_time: new Date().toISOString(),
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: {
          status: "APPROVED",
          purchase_units: [{ custom_id: paypalOrderId }],
        },
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Test COD Webhook", async () => {
    const res = await request(app)
      .post(`/public/webhook/codWebhook?orderId=${codOrderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const orderRes = await getOrder(codOrderId);
    orderRes.body.status.should.equal("processing");
  });

  //   it("Test Paypal Webhook Mismatch", async () => {
  //     const res = await request(app)
  //       .post(`/public/webhook/paypalWebhook?shopId=${testData.shopAtilio.doc._id}`)
  //       .set("shop-id", testData.shopAtilio.doc._id)
  //       .set("x-access-token", testData.front.userJason.token)
  //       .send({
  //         source: "test",
  //         create_time: new Date().toISOString(),
  //         event_type: "CHECKOUT.ORDER.APPROVED",
  //         resource: {
  //           status: "APPROVED",
  //           purchase_units: [{ custom_id: paypalFirstOrderId }],
  //         },
  //       });

  //     if (res.error) console.error(res.error);
  //     res.status.should.equal(200);
  //   });
});
