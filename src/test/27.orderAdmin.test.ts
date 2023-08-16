import Debug from "debug";
import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import HkRegionModel from "../models/hkRegion.model";
import MailModel from "../models/mail.model";
import OrderModel, { OrderDocLean } from "../models/order.model";
import PickUpAddrModel from "../models/pickUpAddr.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:27.orderAdmin.test");

const getMailAndOrder = async (orderId: string) => {
  return await Promise.all([
    MailModel.findOne({
      mailType: "paymentReceivedNotify",
      shopId: testData.shopAtilio.doc._id,
    }).lean(),
    OrderModel.findOne({ _id: orderId }),
  ]);
};

describe("Order Test", () => {
  let noteId: string;
  let orderId: string;
  //   let mailId: string;
  let order: OrderDocLean;

  let allDocCount: number;

  before(async () => {
    order = await OrderModel.findOne({ shopId: testData.shopAtilio.doc._id }).lean();
    orderId = order._id.toString();

    allDocCount = await OrderModel.countDocuments({ shopId: testData.shopAtilio.doc._id });
  });

  it("List Order - Default Size 50", async () => {
    const res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.list.length.should.equal(50);
    res.body.size.should.equal(allDocCount);
  });

  it("List Order - By Status", async () => {
    const res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        orderStatuses: ["cancelled"],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.list.length.should.equal(2);
    res.body.size.should.equal(2);
  });

  it("List Order - By Customer", async () => {
    const res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        userIds: [testData.front.userJason.doc._id],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.size.should.equal(allDocCount);
  });

  it("List Order - By Customer & Status", async () => {
    const res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        userIds: [testData.front.userJason.doc._id],
        orderStatuses: ["cancelled"],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.size.should.equal(2);
  });

  it("List Order - By Customer - Zero", async () => {
    const res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        userIds: [new mongoose.Types.ObjectId()],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.size.should.equal(0);
  });

  it("List Order - By Date", async () => {
    const nextDateHKT = new Date("2023-05-01T17:00:00.000Z");

    // change one record
    await OrderModel.findOneAndUpdate(
      {
        shopId: testData.shopAtilio.doc._id,
      },
      {
        $set: {
          createdAt: nextDateHKT,
        },
      }
    );

    // 10:01  - 10:01

    let res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        // using timezone in shop model
        date: {
          from: "2023-05-01",
          to: "2023-05-01",
        },
      });
    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.size.should.equal(0);

    res = await request(app)
      .post("/admin/order/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        // using timezone in shop model
        date: {
          from: "2023-05-02",
          to: "2023-05-02",
        },
      });
    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.size.should.equal(1);
  });

  it("Get Single Order", async () => {
    const res = await request(app) //
      .get(`/admin/order/get?orderId=${orderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.id.should.equal(orderId);
    res.body.payments.length.should.equal(1);
  });

  it("Update Order", async () => {
    const res = await request(app) //
      .post(`/admin/order/update?orderId=${orderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        paymentStatus: "paid",
        orderStatus: "processing",
        orderSequence: 10000056,
        sendEmail: true,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    res.body.paymentStatus.should.equal("paid");
    res.body.status.should.equal("processing");
    res.body.orderNumber.should.equal(10000056);
  });

  it("Update Order - Status Only", async () => {
    const res = await request(app) //
      .post(`/admin/order/update?orderId=${orderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        orderStatus: "pending",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.status.should.equal("pending");
  });

  it("Verify Email Has Sent", async () => {
    const [mail] = await getMailAndOrder(orderId);

    (mail !== null).should.be.true;

    //  mailId = mail._id;
    //  order.logs.at(-1).newValue.type.should.equal("paymentReceivedNotify");
    //  order.logs.at(-1).newValue.to.should.equal("jason.ching@hishk.com");
    mail.message.to.should.equal("jason.ching@hishk.com");
  });

  // it("Update Order With Log Note", async () => {
  //   const res = await request(app) //
  //     .post(`/admin/order/update?orderId=${orderId}`)
  //     .set("shop-id", testData.shopAtilio.doc._id)
  //     .set("x-access-token", testData.userJason.token)
  //     .send({
  //       paymentStatus: "refunded",
  //       orderStatus: "cancelled",
  //       orderSequence: 10000057,
  //       sendEmail: false,
  //       // noteTitle: "payment reprocessed",
  //       noteBody: "client called to reprocess payment offline and sent proof",
  //     });

  //   if (res.error) console.error(res.error);
  //   res.status.should.equal(200);

  //   res.body.status.should.equal("cancelled");
  //   const latestLog = res.body.logs.at(-1);

  //   debug("note", res.body);
  //   latestLog.note.body.should.equal("client called to reprocess payment offline and sent proof");
  // });

  it("Update Order - SF Address", async () => {
    const res = await request(app) //
      .post(`/admin/order/updateShipAddr?orderId=${orderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        shipType: "sf",
        sfCode: "H852FG61P",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.shipType.should.equal("sf");
    res.body.sfLocation.code.should.equal("H852FG61P");
  });

  it("Update Order - Basic Address", async () => {
    const selectedRegion = await HkRegionModel.findOne().lean();

    const res = await request(app) //
      .post(`/admin/order/updateShipAddr?orderId=${orderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        shipType: "basic",
        addr: {
          recipientName: "Jason Ching",
          telCountryCode: "852",
          tel: "92608630",
          countryCode: "852",
          address: "RM 1906, FLOOR 19, SEAPOWER CENTER",
          subDistrictId: selectedRegion._id.toString(),
          // region: "Kowloon",
          // district: "Kowloon City",
        },
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    console.log("addr", res.body);
    res.body.shipType.should.equal("basic");
    (res.body.sfLocation === undefined).should.be.true;
    res.body.shipAddr.address.should.equal("RM 1906, FLOOR 19, SEAPOWER CENTER");
    res.body.shipAddr.region.should.equal(selectedRegion.region.en);
    res.body.shipAddr.subDistrict.should.equal(selectedRegion.sub_district.en);
  });

  it("Update Order - Pickup Addr", async () => {
    const pickupAddr = await PickUpAddrModel.findOne({
      shop_id: testData.shopAtilio.doc._id,
    }).lean();

    const res = await request(app) //
      .post(`/admin/order/updateShipAddr?orderId=${orderId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        shipType: "pickup",
        pickupAddrId: pickupAddr._id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.shipType.should.equal("pickup");
    (res.body.shipAddr === undefined).should.be.true;
    (res.body.pickupAddr !== undefined).should.be.true;
  });

  it("Verify Email Has Not Sent", async () => {
    const mail = await MailModel.findOne({
      mailType: "paymentRefundedNotify",
      shopId: testData.shopAtilio.doc._id,
    }).lean();

    (mail === null).should.be.true;
  });

  it("Create Order Note", async () => {
    const res = await request(app) //
      .post(`/admin/order/createNote`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        orderId,
        body: "this is the test body",
      });

    if (res.error) console.error(res.error);

    noteId = res.body.notes[0]._id;
    res.status.should.equal(200);
    res.body.notes.length.should.equal(1);
    res.body.notes[0].body.should.equal("this is the test body");
  });

  it("Update Order Note", async () => {
    const res = await request(app) //
      .post(`/admin/order/updateNote?noteId=${noteId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        orderId,
        body: "this is the updated body",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body._id.should.equal(orderId);
    res.body.notes[0].body.should.equal("this is the updated body");
  });

  //   it("Resend Order Mail", async () => {
  //     const res = await request(app) //
  //       .post(`/admin/order/resendMail?mailId=${mailId}`)
  //       .set("shop-id", testData.shopAtilio.doc._id)
  //       .set("x-access-token", testData.userJason.token)
  //       .send({ orderId });

  //     if (res.error) console.error(res.error);
  //     res.status.should.equal(200);

  //     const [mail] = await getMailAndOrder(orderId);
  //     mail.message.to.should.equal("jason.ching@hishk.com");
  //   });
});
