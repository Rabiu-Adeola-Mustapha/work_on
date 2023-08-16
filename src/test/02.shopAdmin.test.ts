import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import AdminUserModel, { AdminUserDocLean } from "../models/adminUser.model";
import CountryModel from "../models/country.model";
import MailModel from "../models/mail.model";
import ShopModel, { ShopType } from "../models/shop.model";
import Config from "../utils/config";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:shopAdmin.test");

chai.should();

async function getShop() {
  const res = await request(app)
    .get("/admin/shop/get")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.userJason.token);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return res;
}

async function updateShop(data: any) {
  const res = await request(app)
    .post("/admin/shop/update")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", testData.userJason.token)
    .send(data);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return res;
}

async function shopList() {
  const res = await request(app) //
    .get("/admin/shop/list")
    .set("x-access-token", testData.userJason.token);

  res.status.should.equal(200);
  return res;
}

export async function userRegistrationVerify(user: AdminUserDocLean, password: string) {
  const mail = await MailModel.findOne({ admin_user_id: user._id });
  (mail !== null).should.be.true;

  const match = mail.message.html.match(/"(http.\S*)"/);
  const url = match[1];

  (url !== null).should.be.true;

  const userId = user._id.toString() as string;
  let res = await request(app) //
    .get(`/admin/verifyUserStatus?userId=${userId}&emailVerificationCode=${user.email_verification_code}`);

  if (res.error) console.error(res.error);

  res.status.should.equal(200);
  res.body.status.should.equal("pending");

  res = await request(app) //
    .post("/admin/verifyUser")
    .send({
      userId: user._id,
      emailVerificationCode: user.email_verification_code,
      password,
    });

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
}

describe("Shop Admin Test", async () => {
  before(async () => {
    // testData.shopAtilio.doc = await shopTask.createShopAttilio(testData.userJason.doc._id);
  });

  it("Create Attilio", async () => {
    const res = await request(app)
      .post("/admin/shop/create")
      .set("x-access-token", testData.userJason.token)
      .send({
        name: { en: "Attilio" },
        code: "attilio",
        locales: ["en", "zh-Hant", "zh-Hans"],
        defaultLocale: "en",
        currencies: ["HKD", "CNY", "USD"],
        defaultCurrency: "HKD",
        googleKey: {
          client_id: "250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com",
          secret: "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",
        },

        // prod_key:
        // "pk_live_51Bpsj5KudJ7SqVF45AoAU1EJdKkdEF2Q3Z5KRHyUMYuZYCOhC5SkNFt5CsTaR2BiCW6fBr9JlWmOc00YG0IYprcj00UyF4Izwj",
        // prod_secret: "sk_live_FWdt2mW67r4pkBpC8qVSUXQO",
        stripeKeyClientId: "Stripe test client Id",
        stripeKeySecret: "Stripe test Secret",

        // prod_key: "Not applicable",
        // prod_secret: "prod_secret",
        paypalKeyClientId: "Paypal test client Id",
        paypalKeySecret: "Paypal test Secret",

        smtp_from: Config.smtpFrom,
        smtp_transport: Config.smtp,
        rootUrl: "http://localhost:3001",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    debug("shake", { body: res.body });
    testData.shopAtilio.doc = await ShopModel.findById(res.body.shopId).lean();
  });

  it("Create DayDayBuy (Multi Merchant)", async () => {
    const res = await request(app)
      .post("/admin/shop/create")
      .set("x-access-token", testData.userJason.token)
      .send({
        shopType: ShopType.multiMerchant,
        name: { en: "Day Day Buy" },
        code: "daydaybuy",
        locales: ["en", "zh-Hant", "zh-Hans"],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    testData.daydaybuy.doc = await ShopModel.findById(res.body.shopId).lean();
    // const { daydaybuy, mywine } = await shopTask.createMultiMerchant(testData.userJason.doc._id);
    // testData.daydaybuy.doc = daydaybuy;
    // testData.mywine.doc = mywine;
  });

  let ddbShopId: string;

  it("Shop List is showing DayDayBuy", async () => {
    const res = await request(app) //
      .get("/admin/shop/list")
      .set("x-access-token", testData.userJason.token);

    if (res.error) {
      console.error(res.error);
    }
    res.status.should.equal(200);
    res.body.length.should.equal(2);

    (res.body[0].id !== undefined).should.be.true;

    // debug("shop", res.body[0]);

    res.body[0].name.en.should.equal("Attilio");
    res.body[0].locales.toString().should.equal(["en", "zh-Hant", "zh-Hans"].toString());
    ddbShopId = res.body[0].id;
  });

  it("DayDayBuy has this user", async () => {
    const res = await request(app) //
      .get("/admin/shop/get")
      .set("shop-id", ddbShopId)
      .set("x-access-token", testData.userJason.token);

    res.status.should.equal(200);
    res.body.shopUsers[0].adminUserId.should.equal(testData.userJason.doc._id.toString());
  });
});

describe("Update Shop - Gooogle Key", () => {
  const stripeTestKeyClientId = "pk_test_gXz9eY8QSGM4aHia8b39BwcA";
  const stripeTestKeySecret = "sk_test_DSZUTrcVPPmxaRkfGN05p9tw";
  const stripeTestWebhookSecret = "whsec_sPuxvFVU8H5qDOh5NnK38Z0xfCDPqxfb";

  const paypalTestKeyClientId = "AeSBo1NhZ_KqhvjLYx2yX94m7YnMVed2gr0cLQRg6na_Hr1YJ9FuWVyaJcH3rCH9n_kkdKyvbPowOTVt";
  const paypalTestKeySecret = "EC5th_357LyzJkxaQu-BgoQiSDOdlimIcCFDH27oYWwakFtKe4aaN-qJXZgwlri2TDPdIlHukJ8P9tbU";
  const paypalTestWebhookSecret = "9UR9879040361812H";

  it("Update Google Key", async () => {
    const res = await updateShop({
      googleKeyClientId: "250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com",
      googleKeySecret: "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",
    });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Update Stripe Key", async () => {
    const res = await updateShop({
      stripeTestKeyClientId,
      stripeTestKeySecret,
      stripeTestWebhookSecret,
      stripeKeyClientId: stripeTestKeyClientId,
      stripeKeySecret: stripeTestKeySecret,
      stripeWebhookSecret: stripeTestWebhookSecret,
    });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Update Stripe Key", async () => {
    const res = await updateShop({
      paypalTestKeyClientId,
      paypalTestKeySecret,
      paypalTestWebhookSecret,
      paypalKeyClientId: paypalTestKeyClientId,
      paypalKeySecret: paypalTestKeySecret,
      paypalWebhookSecret: paypalTestWebhookSecret,
    });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Get Shop Detail", async () => {
    const res = await getShop();

    res.body.googleKeyClientId.should.equal("250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com");
    (res.body.googleKeySecret === undefined).should.be.true;
  });

  it("Get Shop Detail - Verify Webhook keys", async () => {
    const res = await getShop();

    res.body.stripeKeyClientId.should.equal(stripeTestKeyClientId);
    (res.body.stripeKeySecret === undefined).should.be.true;
    (res.body.stripeWebhookSecret === undefined).should.be.true;

    res.body.stripeTestKeyClientId.should.equal(stripeTestKeyClientId);
    (res.body.stripeTestKeySecret === undefined).should.be.true;
    (res.body.stripeTestWebhookSecret === undefined).should.be.true;

    res.body.paypalKeyClientId.should.equal(paypalTestKeyClientId);
    (res.body.paypalKeySecret === undefined).should.be.true;
    (res.body.paypalWebhookSecret === undefined).should.be.true;

    res.body.paypalTestKeyClientId.should.equal(paypalTestKeyClientId);
    (res.body.paypalTestKeySecret === undefined).should.be.true;
    (res.body.paypalTestWebhookSecret === undefined).should.be.true;
  });

  it("Get Shop Detail - Verify Currency", async () => {
    const res = await getShop();

    res.body.defaultCurrency.should.equal("HKD");
    res.body.currencies[0].should.equal("HKD");
    res.body.currencies[1].should.equal("CNY");
    res.body.currencies[2].should.equal("USD");
  });
});

describe("Update Shop - Everything", () => {
  let originalShop: any;

  before(async () => {
    const res = await getShop();
    originalShop = res.body;
  });

  it("Update Name", async () => {
    await updateShop({ name: { en: "Fake Shop" } });

    const res = await getShop();
    res.body.name.en.should.equal("Fake Shop");
  });

  it("Update Locale", async () => {
    await updateShop({ locales: ["en"] });

    const res = await getShop();
    res.body.locales.length === 1;
    res.body.locales[0].should.equal("en");
  });

  it("Update Default Locale", async () => {
    await updateShop({ defaultLocale: "en" });

    const res = await getShop();
    res.body.defaultLocale.should.equal("en");
  });

  it("Update Default Currency", async () => {
    await updateShop({ defaultCurrency: "HKD" });

    const res = await getShop();
    res.body.defaultCurrency.should.equal("HKD");
  });

  it("Update SMTP From", async () => {
    await updateShop({ smtpFrom: "abc@abc.com" });

    const res = await getShop();
    res.body.smtpFrom.should.equal("abc@abc.com");
  });

  it("Update SMTP Transport", async () => {
    await updateShop({
      smtpTransport: {
        someNewField: "hi",
        host: "smtp123.ethereal.email",
        port: 5873,
        auth: {
          user: "fidel.orn@ethereal.email",
          pass: "ejCD37Fz1FSprHyM9x",
        },
      },
    });

    const res = await getShop();
    res.body.smtpTransport.someNewField.should.equal("hi");
    res.body.smtpTransport.host.should.equal("smtp123.ethereal.email");
    res.body.smtpTransport.port.should.equal(5873);
    res.body.smtpTransport.auth.user.should.equal("fidel.orn@ethereal.email");
    res.body.smtpTransport.auth.pass.should.equal("ejCD37Fz1FSprHyM9x");
  });

  it("Update rootUrl", async () => {
    await updateShop({ rootUrl: "http://myshop.com" });

    const res = await getShop();
    res.body.rootUrl.should.equal("http://myshop.com");
  });

  it("secret should still be in database", async () => {
    const shop = await ShopModel.findById(testData.shopAtilio.doc._id).lean();
    shop.google_key_secret.should.equal("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");
  });

  it("Reset Everything", async () => {
    await updateShop(originalShop);
    const res = await getShop();

    res.body.name.en.should.equal(originalShop.name.en);
    res.body.rootUrl.should.equal(originalShop.rootUrl);
  });
});

describe("Create Shop Test", () => {
  it("Create Shop", async () => {
    const res = await request(app)
      .post("/admin/shop/create")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        code: "Testing Shop A",
        googleKeyClientId: "Google Client Id",
        stripeKeyClientId: "Stripe Client Id",
        paypalKeyClientId: "Paypal Client Id",
        googleKeySecret: "Google Secret ID",
        "name.en": "Testing Shop A",
        locales: ["en"],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Verify Created Shop", async () => {
    const res = await shopList();
    (res.body.find((l: any) => l.name.en === "Testing Shop A") !== undefined).should.be.true;
  });
});

describe("Shop List Test", () => {
  it("Don't return user list", async () => {
    const res = await shopList();
    res.status.should.equal(200);

    // Merchant users is using this endpoint also, and they should not see users of the whole shop
    (res.body[0].users === undefined).should.be.true;
  });
});

describe("Admin User Test", () => {
  it("Add Isa as Admin User", async () => {
    const res = await request(app) //
      .post("/admin/shop/addUser")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        email: "isa.tsang@hishk.com",
        type: "shopManager",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    // registration email should be sent out
    const user = await AdminUserModel.findOne({ email: "isa.tsang@hishk.com" }).lean();
    const mail = await MailModel.findOne({ admin_user_id: user._id });
    (mail !== null).should.be.true;

    const match = mail.message.html.match(/"(http.\S*)"/);
    const url = match[1];

    (url !== null).should.be.true;

    await userRegistrationVerify(user, "WERkak!9!@8w@@@@@@@");
  });

  it("Login - Success (Isa)", async () => {
    const res = await request(app) //
      .post("/admin/login")
      .send({
        email: "isa.tsang@hishk.com",
        password: "WERkak!9!@8w@@@@@@@",
      });

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
    (res.body.token !== undefined).should.be.true;
    testData.userIsa.token = res.body.token;
  });

  it("Isa Can See Attilio", async () => {
    const res = await request(app) //
      .get("/admin/shop/list")
      .set("x-access-token", testData.userIsa.token);

    res.status.should.equal(200);
    res.body.length.should.equal(1);
    res.body[0].name.en.should.equal(testData.shopAtilio.doc.name.en);
  });
});

describe("Admin User Test - DayDayBuy", () => {
  it("Add Isa to DayDayBuy", async () => {
    const res = await request(app) //
      .post("/admin/shop/addUser")
      .set("shop-id", testData.daydaybuy.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        email: "isa.tsang@hishk.com",
        type: "shopManager",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Isa Can See DayDayBuy", async () => {
    const res = await request(app) //
      .get("/admin/shop/list")
      .set("x-access-token", testData.userIsa.token);

    res.status.should.equal(200);
    res.body.length.should.equal(2);
    res.body[0].name.en.should.equal(testData.shopAtilio.doc.name.en);
    res.body[1].name.en.should.equal(testData.daydaybuy.doc.name.en);
  });

  it("Shop Manager has no right to add/remove user", async () => {
    const res = await request(app) //
      .post("/admin/shop/addUser")
      .set("shop-id", testData.daydaybuy.doc._id)
      .set("x-access-token", testData.userIsa.token)
      .send({
        email: "abcg@hishk.com",
        type: "shopManager",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(401);
  });
});

describe("Remove User From Shop", () => {
  it("Remove User From Shop", async () => {
    let res = await request(app) //
      .get("/admin/shop/get")
      .set("shop-id", testData.daydaybuy.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const userIsa = res.body.shopUsers.find((u: any) => u.email === "isa.tsang@hishk.com");

    res = await request(app) //
      .post("/admin/shop/removeUser")
      .set("shop-id", testData.daydaybuy.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        adminUserId: userIsa.adminUserId,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Verify Isa can't see DayDayBuy now", async () => {
    const res = await request(app) //
      .get("/admin/shop/list")
      .set("x-access-token", testData.userIsa.token);

    res.status.should.equal(200);
    res.body.length.should.equal(1);
    res.body[0].name.en.should.equal(testData.shopAtilio.doc.name.en);
  });
});

describe("Store Pick Up", () => {
  let addrs: any[] = null;

  async function addPickupAddr(data: any) {
    const res = await request(app) //
      .post("/admin/pickupAddr/add")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send(data);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  }

  it("Add Store Pickup", async () => {
    const hongKong = await CountryModel.findOne({
      "name.en": "Hong Kong SAR",
    }).lean();

    const china = await CountryModel.findOne({
      "name.en": "China",
    }).lean();

    await addPickupAddr({
      countryId: hongKong._id,
      addr: {
        zhHant: "尖沙咀柯士甸道西1號圓方(Elements)1樓1097號舖, West Kowloon",
        en: "Shop 1097, 1/F, Elements, 1 Austin Road West, Tsim Sha Tsui",
        zhHans: "尖沙咀柯士甸道西1號圓方(Elements)1樓1097號舖, West Kowloon",
      },
      tel: "36140587",
      openingHour: {
        zhHant: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
        en: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
        zhHans: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
      },
    });

    await addPickupAddr({
      countryId: hongKong._id,
      addr: {
        zhHant: "中環港景街1號國際金融中心1樓1029-1030號舖",
        en: "Shop 1029-30, 1/F, IFC, 1 Harbour View Street, Central",
        zhHans: "中環港景街1號國際金融中心1樓1029-1030號舖",
      },
      tel: "36140587",
      openingHour: {
        zhHant: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
        en: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
        zhHans: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
      },
    });

    await addPickupAddr({
      countryId: china._id,
      addr: {
        zhHant: "Shop 34, 3, Shangxiajiu Pedestrian Street",
        en: "Shop 34, 3, Shangxiajiu Pedestrian Street",
        zhHans: "Shop 34, 3, Shangxiajiu Pedestrian Street",
      },
      tel: "36140587",
      openingHour: {
        zhHant: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
        en: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
        zhHans: "Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM",
      },
    });
  });

  it("Get Store Pickups", async () => {
    const res = await request(app) //
      .get("/admin/pickupAddr/list")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(3);

    res.body[0].addr.en.should.equal("Shop 1097, 1/F, Elements, 1 Austin Road West, Tsim Sha Tsui");
    res.body[0].tel.should.equal("36140587");
    res.body[0].openingHour.en.should.equal("Mon - Fri 9AM - 8PM\nSat - Sun 8AM - 8PM");
    (res.body[0].id !== undefined).should.be.true;

    addrs = res.body;
  });

  it("Delete Store Pickups", async () => {
    const res = await request(app)
      .post("/admin/pickupAddr/delete")
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token)
      .send({
        id: addrs[0].id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });
});
