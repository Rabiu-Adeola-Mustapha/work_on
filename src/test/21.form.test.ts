import Debug from "debug";
import request from "supertest";

import app from "../app";
import MailModel from "../models/mail.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:21.form.dest");

describe("Form Submission Test", () => {
  let contactFormDefId: string = null;

  it("Submit Contact Form", async () => {
    const res = await request(app) //
      .post("/public/form/send")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        code: "Contact",
        body: {
          title: "Mr",
          name: "Jason Ching",
          email: "jason.ching@hishk.com",
          contact: "92608630",
          date: "2023-02-22",
          message: "Hello There!",
        },
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Admin list - Form Def Found", async () => {
    const res = await request(app)
      .get("/admin/form/listDef")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(1);
    res.body[0].code.should.equal("Contact");
    (res.body[0].id !== undefined).should.be.true;

    contactFormDefId = res.body[0].id;
  });

  it("Admin can see the record in the list", async () => {
    const res = await request(app)
      .get(`/admin/form/listDoc?formDefId=${contactFormDefId}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(1);
    res.body[0].body.name.should.equal("Jason Ching");
  });

  it("Update Form Def", async () => {
    const res = await request(app)
      .post("/admin/form/updateDef")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        formDefId: contactFormDefId,
        code: "Contact",
        notifyEmails: ["jason.ching@hishk.com", "jasonching2005@gmail.com"],
      });

    res.status.should.equal(200);
  });
});

describe("Form with Email Notification", () => {
  it("Create Form Def", async () => {
    const res = await request(app)
      .post("/admin/form/createDef")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        code: "New Form",
        notifyEmails: ["jason.ching@hishk.com", "jasonching2005@gmail.com"],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Send Form", async () => {
    const res = await request(app) //
      .post("/public/form/send")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        code: "New Form",
        body: {
          title: "Mr",
          name: "Jason Ching",
          email: "jason.ching@hishk.com",
          contact: "92608630",
          date: "2023-02-22",
          message: "Hello There!",
        },
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Verify Email Has Sent", async () => {
    const mail = await MailModel.findOne({
      mailType: "formSubmitNotify",
      shopId: testData.shopAtilio.doc._id,
    }).lean();

    (mail !== null).should.be.true;
    mail.message.to[0].should.equal("jason.ching@hishk.com");
    mail.message.to[1].should.equal("jasonching2005@gmail.com");
  });
});
