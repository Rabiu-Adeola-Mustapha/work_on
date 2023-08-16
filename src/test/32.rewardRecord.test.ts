import Debug from "debug";
import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
// import rewardCore from "../core/reward.core";
import CountryModel from "../models/country.model";
import PaySettingModel, { PayType } from "../models/paySetting.model";
import ProductModel, { ProductDocLean } from "../models/product.model";
import RewardRecordModel from "../models/rewardRecord.model";
import ShipSettingModel from "../models/shipSetting.model";
import UserModel from "../models/user.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:32.rewardRecord.test");

async function addToCart(productId: string): Promise<string> {
  const cart = await request(app) //
    .get("/public/cart/getId")
    .set("shop-id", testData.shopAtilio.doc._id);
  const cartId = cart.body.cartId;

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

async function createOrder(product: ProductDocLean, payType: PayType, rewardUsed: number = 2) {
  const hongKong = await CountryModel.findOne({ iso: "HK" }).lean();
  const hongKongId = hongKong._id.toString() as string;
  const shipSetting = await ShipSettingModel.findOne({ "options.shipType": "basic" });
  const shipOption = shipSetting.options[0];
  const payOption = await PaySettingModel.findOne({ payType });
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
    paymentId: payOption._id,
    shipAddrId: addrId,
    items: [{ productId: product._id, quantity: 1 }],
    orderRewardPoints: product.rewardPayout,
    rewardUsed,
  };

  const cartId = await addToCart(product._id);

  const res = await request(app)
    .post(`/public/order/createOrder`)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send({ ...data, cartId });
  if (res.error) console.error(res.error);
  return res.body;
}

async function getOrderRecords(orderId: mongoose.Types.ObjectId) {
  const [earnedReward, redeemedReward] = await Promise.all([
    RewardRecordModel.findOne({ orderId, points: { $gt: 0 } }),
    RewardRecordModel.findOne({ orderId, points: { $lt: 0 } }),
  ]);

  return { earnedReward, redeemedReward };
}

// async function getSession(sessionId: string) {
//   const res = await request(app)
//     .get(`/public/checkout/getSession?id=${sessionId}`)
//     .set("shop-id", testData.shopAtilio.doc._id)
//     .set("x-access-token", testData.front.userJason.token);

//   if (res.error) console.error(res.error);
//   res.status.should.equal(200);
//   return res;
// }

describe("Reward Record Test", () => {
  let product: ProductDocLean;

  before(async () => {
    // clear records
    await RewardRecordModel.deleteMany();

    product = await ProductModel.findOneAndUpdate(
      { shop_id: testData.shopAtilio.doc._id, name: { $exists: true } },
      { $set: { rewardPayout: 4 }, $push: { category_ids: testData.shopAtilio.cats.p1._id } },
      { new: true }
    );
  });

  it("Generate Reward Records", async () => {
    const order = await createOrder(product, "paypal");

    const { earnedReward, redeemedReward } = await getOrderRecords(order.id);

    earnedReward.status.should.equal("pending");
    redeemedReward.status.should.equal("pending");
  });

  it("List Reward Records - Pending Not Counted", async () => {
    const res = await request(app)
      .get("/public/rewardRecord/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(0);
  });

  it("Activates Reward Status - Paypal Webhook Paid", async () => {
    const order = await createOrder(product, "paypal");

    const { earnedReward, redeemedReward } = await getOrderRecords(order.id);

    earnedReward.status.should.equal("pending");
    redeemedReward.status.should.equal("pending");

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
          purchase_units: [{ custom_id: order.id }],
        },
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const { earnedReward: updatedEarned, redeemedReward: updatedRedeemed } = await getOrderRecords(order.id);

    updatedEarned.status.should.equal("active");
    updatedRedeemed.status.should.equal("active");
  });

  it("List Reward Records - Active Counted", async () => {
    const res = await request(app)
      .get("/public/rewardRecord/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(2);
  });

  it("Activates Reward Status - Stripe Webhook Paid", async () => {
    const order = await createOrder(product, "stripe");

    const { earnedReward, redeemedReward } = await getOrderRecords(order.id);

    earnedReward.status.should.equal("pending");
    redeemedReward.status.should.equal("pending");

    const res = await request(app)
      .post(`/public/webhook/stripeWebhook?shopId=${testData.shopAtilio.doc._id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        source: "test",
        created: Math.floor(new Date().getTime() / 1000),
        data: {
          object: { client_reference_id: order.id },
        },
        type: "checkout.session.completed",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const { earnedReward: updatedEarned, redeemedReward: updatedRedeemed } = await getOrderRecords(order.id);

    updatedEarned.status.should.equal("active");
    updatedRedeemed.status.should.equal("active");
  });

  it("Activates Reward Status - Admin Set To Paid (COD)", async () => {
    const order = await createOrder(product, "cod");

    const { earnedReward, redeemedReward } = await getOrderRecords(order.id);

    earnedReward.status.should.equal("pending");
    redeemedReward.status.should.equal("pending");

    const res = await request(app) //
      .post(`/admin/order/update?orderId=${order.id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        paymentStatus: "paid",
        orderStatus: "processing",
        orderSequence: 20000057,
        sendEmail: true,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const { earnedReward: updatedEarned, redeemedReward: updatedRedeemed } = await getOrderRecords(order.id);

    updatedEarned.status.should.equal("active");
    updatedRedeemed.status.should.equal("active");
  });

  it("Cancels Reward Reward - Admin Set To Refunded ", async () => {
    const order = await createOrder(product, "paypal");

    const { earnedReward, redeemedReward } = await getOrderRecords(order.id);

    earnedReward.status.should.equal("pending");
    redeemedReward.status.should.equal("pending");

    const res = await request(app) //
      .post(`/admin/order/update?orderId=${order.id as string}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        paymentStatus: "refunded",
        orderStatus: "processing",
        orderSequence: 20000058,
        sendEmail: true,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const { earnedReward: updatedEarned, redeemedReward: updatedRedeemed } = await getOrderRecords(order.id);

    updatedEarned.status.should.equal("cancelled");
    updatedRedeemed.status.should.equal("cancelled");
  });
});

// describe("Reward Calculation Test", () => {
//   let product: ProductDocLean;

//   let orderId: string;

//   before(async () => {
//     await RewardRecordModel.deleteMany();

//     product = await ProductModel.findOneAndUpdate(
//       { shop_id: testData.shopAtilio.doc._id, name: { $exists: true } },
//       { $set: { rewardPayout: 4 }, $push: { category_ids: testData.shopAtilio.cats.p1._id } },
//       { new: true }
//     );
//   });

//   it("Calculate User Reward - Pending Records Not Added", async () => {
//     const order = await createOrder(product, "paypal", 0);
//     orderId = order.id;

//     const res = await rewardCore.getUserRewardPoints(testData.shopAtilio.doc._id, testData.userJason.doc._id);

//     //  res.should.equal(NaN);
//   });

//   it("Calculate User Reward - Active Records Not Added", async () => {
//     const payRes = await request(app)
//       .post(`/public/webhook/paypalWebhook?shopId=${testData.shopAtilio.doc._id as string}`)
//       .set("shop-id", testData.shopAtilio.doc._id)
//       .set("x-access-token", testData.front.userJason.token)
//       .send({
//         source: "test",
//         create_time: new Date().toISOString(),
//         event_type: "CHECKOUT.ORDER.APPROVED",
//         resource: {
//           status: "APPROVED",
//           purchase_units: [{ custom_id: orderId }],
//         },
//       });

//     if (payRes.error) console.error(payRes.error);
//     payRes.status.should.equal(200);

//     const result = await getOrderRecords(new mongoose.Types.ObjectId(orderId));
//     debug(result);
//     debug("302", testData.shopAtilio.doc._id, testData.userJason.doc._id);
//     const res = await rewardCore.getUserRewardPoints(testData.shopAtilio.doc._id, testData.userJason.doc._id);
//     res.should.equal(4);
//   });

//   it("Calculate User Reward - Active Records Not Added", async () => {
//     const order = await createOrder(product, "paypal", 2);
//     order.rewardPayout.should.equal(product.rewardPayout);
//     order.rewardRedeemed.should.equal(2);
//   });
// });
