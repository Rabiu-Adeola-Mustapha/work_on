import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import MailModel from "../models/mail.model";
import UserModel from "../models/user.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:product.test");

chai.should();

describe("Register Front Test", async () => {
  let userId = null as string;

  it("Register User", async () => {
    const res = await request(app) //
      .post("/public/user/register")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        firstName: "Jason",
        lastName: "Ching",
        countryCode: 852,
        mobileNumber: 92608630,
        email: "jason.ching@hishk.com",
        password: "myPasSw0Rd##",
        confirmPassword: "myPasSw0Rd##",
      });

    res.status.should.equal(200);
    userId = res.body.userId;
  });

  it("Login - Not Allowed Before SMS Verified", async () => {
    const res = await request(app) //
      .post("/public/user/loginByMobile")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        countryCode: 852,
        mobileNumber: 92608630,
        password: "myPasSw0Rd##",
      });

    if (res.error) console.log(res.error);

    res.status.should.equal(401);
    res.body.message.should.equal("mobileNeedVerify");
    (res.body.token === undefined).should.be.true;
  });

  it("Verify OTP - Mismatched", async () => {
    const res = await request(app) //
      .post("/public/user/verifySmsOtp")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        countryCode: 852,
        mobileNumber: 92608630,
        otp: "12345",
      });

    res.status.should.equal(401);
    res.body.message.should.equal("mismatched");
  });

  it("Verify OTP - Success", async () => {
    const user = await UserModel.findById(userId).lean();

    user.sms_otp.length.should.equal(6);

    const res = await request(app) //
      .post("/public/user/verifySmsOtp")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        countryCode: 852,
        mobileNumber: 92608630,
        otp: user.sms_otp,
      });

    res.status.should.equal(200);
  });

  it("Login by Mobile - Success", async () => {
    const res = await request(app) //
      .post("/public/user/loginByMobile")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        countryCode: 852,
        mobileNumber: 92608630,
        password: "myPasSw0Rd##",
      });

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;

    testData.front.userJason.token = "local:" + (res.body.token as string);

    testData.front.userJason.doc = await UserModel.findOne({
      provider: "local",
      mobile_number: "85292608630",
    }).lean();
  });
});

describe("Forget Password Test", async () => {
  let code: string;
  let userId: string;

  it("Send Forget Password Request", async () => {
    const res = await request(app) //
      .post("/public/user/requestResetPwd")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        email: "jason.ching@hishk.com",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Check Email", async () => {
    const mail = await MailModel.findOne({
      mailType: "frontResetPwd",
    }).lean();

    (mail !== null).should.be.true;

    const linkRegex = /code=([^&]*)&userId=([^"]*)/;
    [, code, userId] = (mail.message.html as string).match(linkRegex);
  });

  it("Reset Password", async () => {
    const res = await request(app) //
      .post("/public/user/resetPwd")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        code,
        userId,
        password: "EK38sSK!81",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Login With New Password", async () => {
    const res = await request(app) //
      .post("/public/user/loginByMobile")
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        countryCode: 852,
        mobileNumber: 92608630,
        password: "EK38sSK!81",
      });

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;
    testData.front.userJason.token = "local:" + (res.body.token as string);
  });
});
