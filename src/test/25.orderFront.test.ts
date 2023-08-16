import path from "path";

import Debug from "debug";
import request from "supertest";

import app from "../app";
import CountryModel from "../models/country.model";
import OrderModel from "../models/order.model";
import { PaymentSessionPoJo } from "../models/paymentSession.model";
import PaySettingModel, { PaySettingDocLean } from "../models/paySetting.model";
import ProductModel from "../models/product.model";
import ShipSettingModel, { ShipSettingOptionDocLean } from "../models/shipSetting.model";
import UserModel from "../models/user.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:25.orderFront.test");

async function getCartId() {
  const res = await request(app).get("/public/cart/getId").set("shop-id", testData.shopAtilio.doc._id);

  return res.body.cartId;
}

async function addToCart(productIds: string[]): Promise<string> {
  const cartId = await getCartId();
  for (const productId of productIds) {
    await request(app).post("/public/cart/addProduct").set("shop-id", testData.shopAtilio.doc._id).send({
      cartId,
      productId,
      quantity: 1,
    });
  }

  return cartId;
}

async function getCartCount(cartId: string): Promise<number> {
  const res = await request(app)
    .get(`/public/cart/getCount?cartId=${cartId}`)
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token);

  if (res.error) console.error(res.error);

  return res.body.count;
}

async function getPayOption(paymentType: string, paymentOnDelivery: Boolean = false) {
  const payOption = await PaySettingModel.create({
    shopId: testData.shopAtilio.doc._id,
    payType: paymentType,
    name: { en: paymentType.toUpperCase() },
    setting: {
      message: { en: "message" },
      qrCode: "",
      paymentOnDelivery,
    },
    isActive: true,
  });
  return payOption;
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

describe("Order Test", () => {
  let productIds: string[];
  let hongKongId: string;
  let data: any;
  let CODSessionId: string;
  let stripeFirstOrderId: string;
  let paypalFirstOrderId: string;
  let codFirstOrderId: string;
  let paymentOnDeliveryOrderId: string;
  let stripeFirstOrderSessionId: string;
  let paypalFirstOrderSessionId: string;
  let shipOption: ShipSettingOptionDocLean;
  let codOption: PaySettingDocLean;
  let stripeOption: PaySettingDocLean;
  let paypalOption: PaySettingDocLean;

  before(async () => {
    const products = await ProductModel.find({
      shop_id: testData.shopAtilio.doc._id,
      name: { $exists: true },
    })
      .limit(3)
      .lean();

    productIds = products.map((p) => p._id as string);
    const shipSetting = await ShipSettingModel.findOne({ "options.shipType": "basic" });
    shipOption = shipSetting.options[0];
    const hongKong = await CountryModel.findOne({ iso: "HK" }).lean();
    hongKongId = hongKong._id.toString() as string;
    const orderItems = products.map((p) => ({ productId: p._id, quantity: 1 }));

    const user = await UserModel.findOne({ _id: testData.front.userJason.doc._id });

    const addrId = user.ship_addrs[0]._id;
    // const kowloonTong = await HkRegionModel.findOne({ "sub_distrct.en": "Kowloon Tong" }).lean();

    // Enter the Address / Select previously saved address
    // -- Add new address
    // make the order, we got addressId
    data = {
      countryId: hongKongId,
      shipping: 10,
      itemsTotal: 102,
      taxTotal: 10,
      total: 112,
      currency: "HKD",
      shipType: shipOption.shipType, // basic
      shipName: shipOption.name,
      shipId: shipOption._id,
      addrType: "regular",
      shipAddrId: addrId,
      items: orderItems,
    };
  });

  it("Create Offline Order", async () => {
    const cartId = await addToCart(productIds);
    const intitialCount = await getCartCount(cartId);
    codOption = await getPayOption("cod");

    const res = await request(app)
      .post("/public/order/createOrder")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        ...data,
        cartId,
        paymentId: codOption._id,
      });
    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    codFirstOrderId = res.body.id;
    res.body.payments[0].paymentType.should.equal("cod");
    res.body.status.should.equal("pending");
    res.body.paymentStatus.should.equal("awaiting");

    //  TODO: confirm log creation, mail sent is Logged inconsistently. Not sure why
    //  res.body.logs.length.should.equal(2);
    //  res.body.logs[1].newValue.should.equal("COD");

    //  confirm product is removed from cart
    intitialCount.should.equal(3);
    (await getCartCount(cartId)).should.equal(0);

    res.body.shipAddr.region.should.equal("Hong Kong");
    res.body.shipAddr.district.should.equal("Southern");
    res.body.shipAddr.subDistrict.should.equal("Ap Lei Chau");
  });

  it("Create Offline Order - PaymentOnDelivery", async () => {
    const cartId = await addToCart(productIds);
    const intitialCount = await getCartCount(cartId);
    codOption = await getPayOption("cod", true);

    const res = await request(app)
      .post("/public/order/createOrder")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        ...data,
        cartId,
        paymentId: codOption._id,
      });
    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    paymentOnDeliveryOrderId = res.body.id;
    res.body.payments[0].paymentType.should.equal("cod");

    res.body.status.should.equal("processing");
    res.body.paymentStatus.should.equal("awaiting");

    //  TODO: confirm log creation, mail sent is Logged inconsistently. Not sure why
    //  res.body.logs.length.should.equal(2);
    //  res.body.logs[1].newValue.should.equal("COD");

    //  confirm product is removed from cart
    intitialCount.should.equal(3);
    (await getCartCount(cartId)).should.equal(0);

    res.body.shipAddr.region.should.equal("Hong Kong");
    res.body.shipAddr.district.should.equal("Southern");
    res.body.shipAddr.subDistrict.should.equal("Ap Lei Chau");
  });

  it("Create Stripe Order", async () => {
    const cartId = await addToCart(productIds);
    const intitialCount = await getCartCount(cartId);
    stripeOption = await getPayOption("stripe");

    const res = await request(app)
      .post("/public/order/createOrder")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        ...data,
        cartId,
        paymentId: stripeOption._id,
      });
    if (res.error) console.error(res.error);

    stripeFirstOrderId = res.body.id;
    stripeFirstOrderSessionId = res.body.payments[0].sessionId;

    res.status.should.equal(200);
    res.body.payments[0].paymentType.should.equal("stripe");

    res.body.status.should.equal("pending");
    res.body.paymentStatus.should.equal("awaiting");

    //  TODO: confirm log creation, mail sent is Logged inconsistently. Not sure why
    //  res.body.logs.length.should.equal(2);
    //  res.body.logs[1].newValue.should.equal("stripe");

    //  confirm product is removed from cart
    intitialCount.should.equal(3);
    (await getCartCount(cartId)).should.equal(0);
  });

  it("Create Paypal Order", async () => {
    const cartId = await addToCart(productIds);
    const intitialCount = await getCartCount(cartId);
    paypalOption = await getPayOption("paypal");

    const res = await request(app)
      .post("/public/order/createOrder")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        ...data,
        cartId,
        paymentId: paypalOption._id,
      });

    if (res.error) console.error(res.error);

    paypalFirstOrderId = res.body.id;
    paypalFirstOrderSessionId = res.body.payments[0].sessionId;

    res.status.should.equal(200);
    res.body.payments[0].paymentType.should.equal("paypal");

    res.body.status.should.equal("pending");
    res.body.paymentStatus.should.equal("awaiting");

    //  TODO: confirm log creation, mail sent is Logged inconsistently. Not sure why
    //  res.body.logs.length.should.equal(2);
    //  res.body.logs[1].newValue.should.equal("paypal");

    //  confirm product is removed from cart
    intitialCount.should.equal(3);
    (await getCartCount(cartId)).should.equal(0);
  });

  it("Updates Stripe First Order with a COD Session", async () => {
    const res = await request(app)
      .post("/public/order/updatePayment")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        id: stripeFirstOrderId,
        sessionId: stripeFirstOrderSessionId,
        paymentId: codOption._id,
        ...data,
      });

    if (res.error) console.error(res.error);
    CODSessionId = res.body.payments[1].sessionId;

    res.status.should.equal(200);
    res.body.payments.length.should.equal(2);
    res.body.payments[0].isActiveSession.should.equal(false);
    res.body.payments[1].paymentType.should.equal("cod");
    res.body.payments[1].isActiveSession.should.equal(true);
    //  TODO: confirm log creation, mail sent is Logged inconsistently. Not sure why
    //  res.body.logs.length.should.equal(5);
    //  res.body.logs[4].newValue.should.equal("COD");
  });

  it("Updates Paypal First Order with a Stripe Session", async () => {
    const res = await request(app)
      .post("/public/order/updatePayment")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        id: paypalFirstOrderId,
        sessionId: paypalFirstOrderSessionId,
        paymentId: stripeOption._id,
        ...data,
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.payments.length.should.equal(2);
    res.body.payments[0].isActiveSession.should.equal(false);
    res.body.payments[1].paymentType.should.equal("stripe");
    res.body.payments[1].isActiveSession.should.equal(true);

    //  confirm log creation
    //  res.body.logs.length.should.equal(3);
    //  res.body.logs[2].newValue.should.equal("stripe");
  });

  it("Recovers Already Existing Stripe Session from Order", async () => {
    const res = await request(app)
      .post("/public/order/updatePayment")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        id: stripeFirstOrderId,
        sessionId: CODSessionId,
        paymentId: stripeOption._id,
        ...data,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    const activeSession = res.body.payments.find((payment: PaymentSessionPoJo) => payment.isActiveSession === true);
    activeSession.paymentType.should.equal("stripe");
    activeSession.sessionId.should.equal(stripeFirstOrderSessionId);

    //  confirm log creation
    //  debug(res.body.logs);
    //  res.body.logs.length.should.equal(6);
    //  res.body.logs[5].newValue.should.equal("STRIPE");
  });

  it("Uploads Proof of payment", async () => {
    const file = path.join(__dirname, "..", "..", "testData/netflix.jpeg");

    const res = await request(app)
      .post(`/public/order/uploadProof?orderId=${codFirstOrderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .attach("media", file);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("List Order", async () => {
    const res = await request(app)
      .get("/public/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    res.body.length.should.equal(4);
  });

  it("Get Single Order", async () => {
    const res = await getOrder(codFirstOrderId);

    res.body.id.should.equal(codFirstOrderId);

    //  confirm cod order has uploaded proof
    (res.body.paymentProof !== undefined).should.be.true;
    res.body.paymentProof.filename.startsWith("netflix").should.be.true;
    (res.body.paymentProof.thumbnailUrl !== undefined).should.be.true;
  });

  it("Cancels Order - Status Pending", async () => {
    const res = await request(app)
      .post(`/public/order/cancel?orderId=${stripeFirstOrderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    const orderRes = await getOrder(stripeFirstOrderId);
    orderRes.body.status.should.equal("cancelled");
  });

  it("Cancels Order - Status Processing", async () => {
    const res = await request(app)
      .post(`/public/order/cancel?orderId=${paymentOnDeliveryOrderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    const orderRes = await getOrder(paymentOnDeliveryOrderId);
    orderRes.body.status.should.equal("cancelled");
  });

  it("It Fails To Cancel Order - Status Shipped", async () => {
    const adminUpdateRes = await request(app) //
      .post(`/admin/order/update?orderId=${paypalFirstOrderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        orderStatus: "shipped",
      });

    adminUpdateRes.status.should.equal(200);

    const res = await request(app)
      .post(`/public/order/cancel?orderId=${paypalFirstOrderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    res.status.should.equal(401);
    res.body.message.should.equal("ordershipped");
  });

  it("Create 300 Test Orders", async () => {
    // for (let i = 0; i < 300; i++) {
    const cartId = await addToCart(productIds);
    codOption = await getPayOption("cod");

    const res = await request(app)
      .post("/test/create300Orders")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token)
      .send({
        ...data,
        cartId,
        paymentId: codOption._id,
      });

    res.status.should.equal(200);
    // }

    // change 1 order to SF
    await OrderModel.findOneAndUpdate(
      {
        shop_id: testData.shopAtilio.doc._id,
        shipType: "basic",
      },
      {
        $set: {
          shipType: "sf",
          shipAddr: undefined,
          sfLocation: {
            code: "H852K064P",
            address:
              "Site No. LK01, 1/F, Oi Man Plaza, 60 Chung Hau Street, Ho Man Tin, Kowloon City District, Kowloon, Hong Kong (SF Locker)",
            service_partner: "",
            shipping_method: "locker",
            is_hot: "非熱門",
            hours_monfri: "06:00-23:00",
            hours_satsun: "06:00-23:00",
          },
        },
      }
    );

    await OrderModel.findOneAndUpdate(
      {
        shop_id: testData.shopAtilio.doc._id,
        shipType: "basic",
      },
      {
        $set: {
          shipType: "pickup",
          shipAddr: undefined,
          pickupAddr: {
            country_id: "640f0cff7b355b2b7dc766ca",
            addr: "Flat J, 11/F, Wang Kwong Industrial Building, 45 Hung To Road, Kwun Tong, Hong Kong",
            tel: "2191 7610",
            opening_hour: "",
          },
        },
      }
    );
  });
});
