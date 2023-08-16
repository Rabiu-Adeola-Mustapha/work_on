import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import MailModel from "../models/mail.model";
import adminUserTask from "../tasks/adminUser.task";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:01.userAdmin.test");

chai.should();

describe("User Admin Test", async () => {
  before(async () => {
    const user = await adminUserTask.createSuperAdmin("jason.ching@hishk.com", "WERkak!9!@8&1a");

    testData.userJason.doc = user;
  });

  it("Login - Wrong Password", async () => {
    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "jason.ching@hishk.com",
        password: "wrong password",
      });

    if (res.status !== 401 && res.error) {
      console.error(res.error);
    }

    res.status.should.equal(401);
    (res.body.token === undefined).should.be.true;
  });

  it("Login - Success", async () => {
    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "jason.ching@hishk.com",
        password: "WERkak!9!@8&1a",
      });

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;
    testData.userJason.token = res.body.token;
  });

  it("Login - Wrong Email", async () => {
    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "lfsdlf@abc.com",
        password: "dkljew",
      });

    res.status.should.equal(401);
  });
});

describe("User Profile Test", () => {
  it("Get User Profile", async () => {
    const res = await request(app) //
      .get("/admin/me")
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.type.should.equal("superAdmin");
    res.body.email.should.equal("jason.ching@hishk.com");
  });
});

describe("Forget Password Test", () => {
  let code: string;
  let userId: string;

  it("Request Reset Password", async () => {
    const res = await request(app) //
      .post("/admin/requestResetPwd")
      .send({
        email: "jason.ching@hishk.com",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Check Email", async () => {
    const mail = await MailModel.findOne({
      mailType: "resetPwd",
      // shopId: testData.shopAtilio.doc._id,
    }).lean();

    (mail !== null).should.be.true;

    const linkRegex = /code=([^&]*)&userId=([^"]*)/;
    [, code, userId] = (mail.message.html as string).match(linkRegex);
  });

  it("Reset Password", async () => {
    const res = await request(app) //
      .post("/admin/resetPwd")
      .send({
        code,
        userId,
        password: "KErhl32foi3!@#$7sdlja",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Login With New Password", async () => {
    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "jason.ching@hishk.com",
        password: "KErhl32foi3!@#$7sdlja",
      });

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;
    testData.userJason.token = res.body.token;
  });
});

describe("Change Password", () => {
  it("Change Password", async () => {
    const res = await request(app) //
      .post("/admin/changePwd")
      .set("x-access-token", testData.userJason.token)
      .send({
        currentPwd: "KErhl32foi3!@#$7sdlja",
        newPwd: "WERkak!9!@8&1a",
      });

    if (!res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Login With New Password", async () => {
    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "jason.ching@hishk.com",
        password: "WERkak!9!@8&1a",
      });

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;
    testData.userJason.token = res.body.token;
  });
});
