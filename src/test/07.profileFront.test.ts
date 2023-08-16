import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import UserModel from "../models/user.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:profile.test");

chai.should();

async function getProfile() {
  const res = await request(app) //
    .get("/public/user/profile")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token);

  res.status.should.equal(200);
  return res;
}

async function updateProfile(data: { firstName: string; lastName: string }) {
  await request(app) //
    .post("/public/user/updateProfile")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send(data);

  const res = await getProfile();
  return res;
}

async function updateEmail(email: string) {
  const res = await request(app) //
    .post("/public/user/updateEmail")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send({ email });

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return await getProfile();
}

async function updateTel(data: { countryCode: number; mobileNumber: number }) {
  const res = await updateTelRes(data);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return await getProfile();
}

async function updateTelRes(data: { countryCode: number; mobileNumber: number }) {
  return await request(app)
    .post("/public/user/updateTel")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send(data);
}

async function updateTelVerifySmsOtp(otp: string) {
  const res = await request(app)
    .post("/public/user/updateTelVerifySmsOtp")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.front.userJason.token)
    .send({ otp });

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return await getProfile();
}

describe("Profile Front Test", async () => {
  it("Get Profile", async () => {
    const res = await getProfile();

    res.body.firstName.should.equal("Jason");
    res.body.lastName.should.equal("Ching");
    res.body.email.should.equal("jason.ching@hishk.com");
    res.body.mobileNumberVerified.should.be.true;
    res.body.emailVerified.should.be.false;
  });

  it("Updates Profile", async () => {
    const res = await updateProfile({ firstName: "Hugo", lastName: "Siu" });
    res.body.firstName.should.equal("Hugo");
    res.body.lastName.should.equal("Siu");

    const reset = await updateProfile({ firstName: "Jason", lastName: "Ching" });
    reset.body.firstName.should.equal("Jason");
    reset.body.lastName.should.equal("Ching");
  });

  it("Update Email", async () => {
    const res = await updateEmail("abc@abc.com");
    res.body.email.should.equal("abc@abc.com");

    // change it back
    await updateEmail("jason.ching@hishk.com");
  });
});

describe("Verify Email", () => {
  it("Request To Verify", async () => {
    const res = await request(app)
      .post("/public/user/verifyEmail")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.front.userJason.token);

    res.status.should.equal(200);
  });

  it("Access Verification Link", async () => {
    const user = await UserModel.findById(testData.front.userJason.doc._id).lean();

    const res = await request(app) //
      .post("/public/user/verifyEmailCode")
      .send({
        code: user.email_verification_code,
        userId: user._id.toString(),
      });

    res.status.should.equal(200);

    // const mail = await MailModel.findOne({ user_id: testData.front.userJason.doc._id }).lean();

    // debug("message", mail.message.html);
    // const match = mail.message.html.match(/"(http.\S*)"/);
    // const url = match[1];

    // const res = await axios.get(url, {
    //   beforeRedirect: (option) => {
    //     option.href.should.equal("http://localhost:3000/profile");
    //   },
    // });

    res.status.should.equal(200);
  });

  it("Profile Shows Email Verified", async () => {
    const res = await getProfile();
    res.body.emailVerified.should.be.true;
  });
});

describe("Update Tel", () => {
  // The idea is that
  // 1. You need to first verify our new number before the change is done
  // 2. If failed to verify it, there will be no change

  let res: request.Response;

  it("Request to Update Tel - Duplicate", async () => {
    res = await updateTelRes({
      countryCode: 852,
      mobileNumber: 92608630,
    });

    res.status.should.equal(401);
    res.body.message.should.equal("telExists");
  });

  it("Request to Update Tel", async () => {
    res = await updateTel({
      countryCode: 852,
      mobileNumber: 92608631,
    });
  });

  it("Confirm tel is not updated yet", async () => {
    res.body.mobileNumber.should.equal("85292608630");
  });

  it("Verify SMS", async () => {
    const user = await UserModel.findById(testData.front.userJason.doc._id).lean();
    await updateTelVerifySmsOtp(user.updating_sms_otp);
  });

  it("Confirm tel is updated", async () => {
    res = await getProfile();
    console.log("profile", res.body);
    res.body.mobileNumber.should.equal("85292608631");
    res.body.mobileNumberVerified.should.be.true;
  });
});
