import fs from "fs/promises";
import path from "path";

import mongoose from "mongoose";

import mailTemplateCore from "../core/mailTemplate.core";
import CounterModel from "../models/counter.model";
import CountryModel from "../models/country.model";
import HkRegionModel from "../models/hkRegion.model";
import SfLocatonModel, { SfLocationPoJo } from "../models/sfLocation.model";
import ShopModel, { ShopDocLean, ShopType } from "../models/shop.model";
import { ShopUserType } from "../models/shopUser.model";
import Config from "../utils/config";

async function createShopAttilio(adminUserId: string): Promise<ShopDocLean> {
  const shop = await ShopModel.create({
    _id: new mongoose.Types.ObjectId("63788676ff47bf279d8daa76"),
    name: { en: "Attilio" },
    code: "attilio",
    locales: ["en", "zh-Hant", "zh-Hans"],
    default_locale: "en",
    // currencies: ["HKD", "CNY", "USD"],
    default_currency: "USD",
    users: [
      {
        admin_user_id: adminUserId,
        type: ShopUserType.admin,
      },
    ],
    google_key: {
      client_id: "250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com",
      secret: "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",
    },
    smtp_from: Config.smtpFrom,
    smtp_transport: Config.smtp,
    root_url: "http://localhost:3001",
    accessYouAcctNo: "11035914",
    accessYouUser: "11035914",
    accessYouPw: "posazc25663",
    otpMsg: "This is your OTP: {otp}",
  });

  await Promise.all([
    await CounterModel.create({ shopId: shop._id, counterType: "product" }),
    await CounterModel.create({ shopId: shop._id, counterType: "order" }),
    await mailTemplateCore.createMailTemplates(shop.id),
  ]);

  return shop;
}

async function createOfficeman(adminUserId: string) {
  const shop = await ShopModel.create({
    _id: "6434d3b2d3b7b25d19f6a916",
    shop_type: "regular",
    name: {
      en: "Office Man",
      zhHant: "Office Man",
      zhHans: "Office Man",
    },
    code: "officeman",
    locales: ["en", "zh-Hant"],
    default_locale: "en",
    currencies: ["HKD"],
    default_currency: "HKD",
    users: [
      {
        admin_user_id: adminUserId,
        type: "admin",
      },
    ],
    google_key_client_id: "910818429927-hvl718ktdbcn5q1ggi1ct1s15b7endda.apps.googleusercontent.com",
    google_key_secret: "WERkak!9!@8&1a",
    payments: {
      paypal: {
        prod_key: "AeSBo1NhZ_KqhvjLYx2yX94m7YnMVed2gr0cLQRg6na_Hr1YJ9FuWVyaJcH3rCH9n_kkdKyvbPowOTVt",
        prod_secret: "EC5th_357LyzJkxaQu-BgoQiSDOdlimIcCFDH27oYWwakFtKe4aaN-qJXZgwlri2TDPdIlHukJ8P9tbU",
        webhook_prod_secret: "9UR9879040361812H",
        test_key: "AZDpuz6XE4XFcImaYAsVTCd0AF9IEpmFNaztFVjfgjilNNYk3z63sTHPJpm4mBa2J4D4eQmPfji01ysx",
        test_secret: "ED87H8CgN7DQyfkUYZXEyKx4rLsI0sw6kwTilj0mFVqsYGHrI8UlMEeSu4EUexQXGsVAOCPS9Ir0MpCc",
        webhook_test_secret: "9UR9879040361812H",
      },
    },
    order_prefix: "ON",
    product_prefix: "PN",
    smtp_from: '"Officeman 🤖" <hi@hishk.com>',
    smtp_transport: {
      host: "mail.hishk.com",
      port: 465,
      auth: {
        user: "hi@hishk.com",
        pass: "TfG,tq}?4UFu",
      },
    },
    root_url: "http://localhost:3003/",
    rewardPayout: 0,
    rewardRoundOff: "roundUp",
    accessYouUser: "11035914",
    accessYouAcctNo: "11035914",
    accessYouPw: "posazc25663",
    otpMsg: "You Login One-Time-Password (OTP) to Officeman is: {otp}.\n您的 Officeman 一次性密碼 (OTP) 是: {otp}.",
  });

  await Promise.all([
    await CounterModel.create({ shopId: shop._id, counterType: "product" }),
    await CounterModel.create({ shopId: shop._id, counterType: "order" }),
    await mailTemplateCore.createMailTemplates(shop.id),
  ]);

  return shop;
}

async function createMultiMerchant(adminUserId: string) {
  console.log("createMultiMerchant");
  const daydaybuy = await ShopModel.create({
    shop_type: ShopType.multiMerchant,
    name: { en: "Day Day Buy" },
    code: "daydaybuy",
    locales: ["en", "zh-Hant", "zh-Hans"],
    users: [
      {
        admin_user_id: adminUserId,
        type: ShopUserType.admin,
      },
    ],
  });

  // const mywine = await ShopModel.create({
  //   shop_type: ShopType.merchant,
  //   merchant_parent_id: daydaybuy._id,
  //   name: { en: "My Wine" },
  //   code: "mywine",
  //   locales: ["en", "zh-Hant", "zh-Hans"],
  //   users: [
  //     {
  //       admin_user_id: adminUserId,
  //       type: ShopUserType.admin,
  //     },
  //   ],
  // });

  return { daydaybuy };
}

async function addCountryList() {
  await CountryModel.deleteMany();

  await Promise.all([
    CountryModel.create({
      code: "93",
      name: { en: "Afghanistan", zhHant: "Afghanistan", zhHans: "Afghanistan" },
      iso: "AF",
    }),
    CountryModel.create({ code: "355", name: { en: "Albania", zhHant: "Albania", zhHans: "Albania" }, iso: "AL" }),
    CountryModel.create({ code: "213", name: { en: "Algeria", zhHant: "Algeria", zhHans: "Algeria" }, iso: "DZ" }),
    CountryModel.create({
      code: "1-684",
      name: { en: "American Samoa", zhHant: "American Samoa", zhHans: "American Samoa" },
      iso: "AS",
    }),
    CountryModel.create({ code: "376", name: { en: "Andorra", zhHant: "Andorra", zhHans: "Andorra" }, iso: "AD" }),
    CountryModel.create({ code: "244", name: { en: "Angola", zhHant: "Angola", zhHans: "Angola" }, iso: "AO" }),
    CountryModel.create({ code: "1-264", name: { en: "Anguilla", zhHant: "Anguilla", zhHans: "Anguilla" }, iso: "AI" }),
    CountryModel.create({
      code: "672",
      name: { en: "Antarctica", zhHant: "Antarctica", zhHans: "Antarctica" },
      iso: "AQ",
    }),
    CountryModel.create({
      code: "1-268",
      name: { en: "Antigua and Barbuda", zhHant: "Antigua and Barbuda", zhHans: "Antigua and Barbuda" },
      iso: "AG",
    }),
    CountryModel.create({ code: "54", name: { en: "Argentina", zhHant: "Argentina", zhHans: "Argentina" }, iso: "AR" }),
    CountryModel.create({ code: "374", name: { en: "Armenia", zhHant: "Armenia", zhHans: "Armenia" }, iso: "AM" }),
    CountryModel.create({ code: "297", name: { en: "Aruba", zhHant: "Aruba", zhHans: "Aruba" }, iso: "AW" }),
    CountryModel.create({ code: "61", name: { en: "Australia", zhHant: "Australia", zhHans: "Australia" }, iso: "AU" }),
    CountryModel.create({ code: "43", name: { en: "Austria", zhHant: "Austria", zhHans: "Austria" }, iso: "AT" }),
    CountryModel.create({
      code: "994",
      name: { en: "Azerbaijan", zhHant: "Azerbaijan", zhHans: "Azerbaijan" },
      iso: "AZ",
    }),
    CountryModel.create({ code: "1-242", name: { en: "Bahamas", zhHant: "Bahamas", zhHans: "Bahamas" }, iso: "BS" }),
    CountryModel.create({ code: "973", name: { en: "Bahrain", zhHant: "Bahrain", zhHans: "Bahrain" }, iso: "BH" }),
    CountryModel.create({
      code: "880",
      name: { en: "Bangladesh", zhHant: "Bangladesh", zhHans: "Bangladesh" },
      iso: "BD",
    }),
    CountryModel.create({ code: "1-246", name: { en: "Barbados", zhHant: "Barbados", zhHans: "Barbados" }, iso: "BB" }),
    CountryModel.create({ code: "375", name: { en: "Belarus", zhHant: "Belarus", zhHans: "Belarus" }, iso: "BY" }),
    CountryModel.create({ code: "32", name: { en: "Belgium", zhHant: "Belgium", zhHans: "Belgium" }, iso: "BE" }),
    CountryModel.create({ code: "501", name: { en: "Belize", zhHant: "Belize", zhHans: "Belize" }, iso: "BZ" }),
    CountryModel.create({ code: "229", name: { en: "Benin", zhHant: "Benin", zhHans: "Benin" }, iso: "BJ" }),
    CountryModel.create({ code: "1-441", name: { en: "Bermuda", zhHant: "Bermuda", zhHans: "Bermuda" }, iso: "BM" }),
    CountryModel.create({ code: "975", name: { en: "Bhutan", zhHant: "Bhutan", zhHans: "Bhutan" }, iso: "BT" }),
    CountryModel.create({ code: "591", name: { en: "Bolivia", zhHant: "Bolivia", zhHans: "Bolivia" }, iso: "BO" }),
    CountryModel.create({
      code: "387",
      name: { en: "Bosnia and Herzegovina", zhHant: "Bosnia and Herzegovina", zhHans: "Bosnia and Herzegovina" },
      iso: "BA",
    }),
    CountryModel.create({ code: "267", name: { en: "Botswana", zhHant: "Botswana", zhHans: "Botswana" }, iso: "BW" }),
    CountryModel.create({ code: "55", name: { en: "Brazil", zhHant: "Brazil", zhHans: "Brazil" }, iso: "BR" }),
    CountryModel.create({
      code: "246",
      name: {
        en: "British Indian Ocean Territory",
        zhHant: "British Indian Ocean Territory",
        zhHans: "British Indian Ocean Territory",
      },
      iso: "IO",
    }),
    CountryModel.create({
      code: "1-284",
      name: { en: "British Virgin Islands", zhHant: "British Virgin Islands", zhHans: "British Virgin Islands" },
      iso: "VG",
    }),
    CountryModel.create({ code: "673", name: { en: "Brunei", zhHant: "Brunei", zhHans: "Brunei" }, iso: "BN" }),
    CountryModel.create({ code: "359", name: { en: "Bulgaria", zhHant: "Bulgaria", zhHans: "Bulgaria" }, iso: "BG" }),
    CountryModel.create({
      code: "226",
      name: { en: "Burkina Faso", zhHant: "Burkina Faso", zhHans: "Burkina Faso" },
      iso: "BF",
    }),
    CountryModel.create({ code: "257", name: { en: "Burundi", zhHant: "Burundi", zhHans: "Burundi" }, iso: "BI" }),
    CountryModel.create({ code: "855", name: { en: "Cambodia", zhHant: "Cambodia", zhHans: "Cambodia" }, iso: "KH" }),
    CountryModel.create({ code: "237", name: { en: "Cameroon", zhHant: "Cameroon", zhHans: "Cameroon" }, iso: "CM" }),
    CountryModel.create({ code: "1", name: { en: "Canada", zhHant: "Canada", zhHans: "Canada" }, iso: "CA" }),
    CountryModel.create({
      code: "238",
      name: { en: "Cape Verde", zhHant: "Cape Verde", zhHans: "Cape Verde" },
      iso: "CV",
    }),
    CountryModel.create({
      code: "1-345",
      name: { en: "Cayman Islands", zhHant: "Cayman Islands", zhHans: "Cayman Islands" },
      iso: "KY",
    }),
    CountryModel.create({
      code: "236",
      name: { en: "Central African Republic", zhHant: "Central African Republic", zhHans: "Central African Republic" },
      iso: "CF",
    }),
    CountryModel.create({ code: "235", name: { en: "Chad", zhHant: "Chad", zhHans: "Chad" }, iso: "TD" }),
    CountryModel.create({ code: "56", name: { en: "Chile", zhHant: "Chile", zhHans: "Chile" }, iso: "CL" }),
    CountryModel.create({ code: "86", name: { en: "China", zhHant: "中國", zhHans: "中国" }, iso: "CN" }),
    CountryModel.create({
      code: "61",
      name: { en: "Christmas Island", zhHant: "Christmas Island", zhHans: "Christmas Island" },
      iso: "CX",
    }),
    CountryModel.create({
      code: "61",
      name: { en: "Cocos Islands", zhHant: "Cocos Islands", zhHans: "Cocos Islands" },
      iso: "CC",
    }),
    CountryModel.create({ code: "57", name: { en: "Colombia", zhHant: "Colombia", zhHans: "Colombia" }, iso: "CO" }),
    CountryModel.create({ code: "269", name: { en: "Comoros", zhHant: "Comoros", zhHans: "Comoros" }, iso: "KM" }),
    CountryModel.create({
      code: "682",
      name: { en: "Cook Islands", zhHant: "Cook Islands", zhHans: "Cook Islands" },
      iso: "CK",
    }),
    CountryModel.create({
      code: "506",
      name: { en: "Costa Rica", zhHant: "Costa Rica", zhHans: "Costa Rica" },
      iso: "CR",
    }),
    CountryModel.create({ code: "385", name: { en: "Croatia", zhHant: "Croatia", zhHans: "Croatia" }, iso: "HR" }),
    CountryModel.create({ code: "53", name: { en: "Cuba", zhHant: "Cuba", zhHans: "Cuba" }, iso: "CU" }),
    CountryModel.create({ code: "599", name: { en: "Curacao", zhHant: "Curacao", zhHans: "Curacao" }, iso: "CW" }),
    CountryModel.create({ code: "357", name: { en: "Cyprus", zhHant: "Cyprus", zhHans: "Cyprus" }, iso: "CY" }),
    CountryModel.create({
      code: "420",
      name: { en: "Czech Republic", zhHant: "Czech Republic", zhHans: "Czech Republic" },
      iso: "CZ",
    }),
    CountryModel.create({
      code: "243",
      name: {
        en: "Democratic Republic of the Congo",
        zhHant: "Democratic Republic of the Congo",
        zhHans: "Democratic Republic of the Congo",
      },
      iso: "CD",
    }),
    CountryModel.create({ code: "45", name: { en: "Denmark", zhHant: "Denmark", zhHans: "Denmark" }, iso: "DK" }),
    CountryModel.create({ code: "253", name: { en: "Djibouti", zhHant: "Djibouti", zhHans: "Djibouti" }, iso: "DJ" }),
    CountryModel.create({ code: "1-767", name: { en: "Dominica", zhHant: "Dominica", zhHans: "Dominica" }, iso: "DM" }),
    CountryModel.create({
      code: "1-809 1-829 1-849",
      name: { en: "Dominican Republic", zhHant: "Dominican Republic", zhHans: "Dominican Republic" },
      iso: "DO",
    }),
    CountryModel.create({
      code: "670",
      name: { en: "East Timor", zhHant: "East Timor", zhHans: "East Timor" },
      iso: "TL",
    }),
    CountryModel.create({ code: "593", name: { en: "Ecuador", zhHant: "Ecuador", zhHans: "Ecuador" }, iso: "EC" }),
    CountryModel.create({ code: "20", name: { en: "Egypt", zhHant: "Egypt", zhHans: "Egypt" }, iso: "EG" }),
    CountryModel.create({
      code: "503",
      name: { en: "El Salvador", zhHant: "El Salvador", zhHans: "El Salvador" },
      iso: "SV",
    }),
    CountryModel.create({
      code: "240",
      name: { en: "Equatorial Guinea", zhHant: "Equatorial Guinea", zhHans: "Equatorial Guinea" },
      iso: "GQ",
    }),
    CountryModel.create({ code: "291", name: { en: "Eritrea", zhHant: "Eritrea", zhHans: "Eritrea" }, iso: "ER" }),
    CountryModel.create({ code: "372", name: { en: "Estonia", zhHant: "Estonia", zhHans: "Estonia" }, iso: "EE" }),
    CountryModel.create({ code: "251", name: { en: "Ethiopia", zhHant: "Ethiopia", zhHans: "Ethiopia" }, iso: "ET" }),
    CountryModel.create({
      code: "500",
      name: { en: "Falkland Islands", zhHant: "Falkland Islands", zhHans: "Falkland Islands" },
      iso: "FK",
    }),
    CountryModel.create({
      code: "298",
      name: { en: "Faroe Islands", zhHant: "Faroe Islands", zhHans: "Faroe Islands" },
      iso: "FO",
    }),
    CountryModel.create({ code: "679", name: { en: "Fiji", zhHant: "Fiji", zhHans: "Fiji" }, iso: "FJ" }),
    CountryModel.create({ code: "358", name: { en: "Finland", zhHant: "Finland", zhHans: "Finland" }, iso: "FI" }),
    CountryModel.create({ code: "33", name: { en: "France", zhHant: "France", zhHans: "France" }, iso: "FR" }),
    CountryModel.create({
      code: "689",
      name: { en: "French Polynesia", zhHant: "French Polynesia", zhHans: "French Polynesia" },
      iso: "PF",
    }),
    CountryModel.create({ code: "241", name: { en: "Gabon", zhHant: "Gabon", zhHans: "Gabon" }, iso: "GA" }),
    CountryModel.create({ code: "220", name: { en: "Gambia", zhHant: "Gambia", zhHans: "Gambia" }, iso: "GM" }),
    CountryModel.create({ code: "995", name: { en: "Georgia", zhHant: "Georgia", zhHans: "Georgia" }, iso: "GE" }),
    CountryModel.create({ code: "49", name: { en: "Germany", zhHant: "Germany", zhHans: "Germany" }, iso: "DE" }),
    CountryModel.create({ code: "233", name: { en: "Ghana", zhHant: "Ghana", zhHans: "Ghana" }, iso: "GH" }),
    CountryModel.create({
      code: "350",
      name: { en: "Gibraltar", zhHant: "Gibraltar", zhHans: "Gibraltar" },
      iso: "GI",
    }),
    CountryModel.create({ code: "30", name: { en: "Greece", zhHant: "Greece", zhHans: "Greece" }, iso: "GR" }),
    CountryModel.create({
      code: "299",
      name: { en: "Greenland", zhHant: "Greenland", zhHans: "Greenland" },
      iso: "GL",
    }),
    CountryModel.create({ code: "1-473", name: { en: "Grenada", zhHant: "Grenada", zhHans: "Grenada" }, iso: "GD" }),
    CountryModel.create({ code: "1-671", name: { en: "Guam", zhHant: "Guam", zhHans: "Guam" }, iso: "GU" }),
    CountryModel.create({
      code: "502",
      name: { en: "Guatemala", zhHant: "Guatemala", zhHans: "Guatemala" },
      iso: "GT",
    }),
    CountryModel.create({
      code: "44-1481",
      name: { en: "Guernsey", zhHant: "Guernsey", zhHans: "Guernsey" },
      iso: "GG",
    }),
    CountryModel.create({ code: "224", name: { en: "Guinea", zhHant: "Guinea", zhHans: "Guinea" }, iso: "GN" }),
    CountryModel.create({
      code: "245",
      name: { en: "Guinea-Bissau", zhHant: "Guinea-Bissau", zhHans: "Guinea-Bissau" },
      iso: "GW",
    }),
    CountryModel.create({ code: "592", name: { en: "Guyana", zhHant: "Guyana", zhHans: "Guyana" }, iso: "GY" }),
    CountryModel.create({ code: "509", name: { en: "Haiti", zhHant: "Haiti", zhHans: "Haiti" }, iso: "HT" }),
    CountryModel.create({ code: "504", name: { en: "Honduras", zhHant: "Honduras", zhHans: "Honduras" }, iso: "HN" }),
    CountryModel.create({ code: "852", name: { en: "Hong Kong SAR", zhHant: "香港", zhHans: "香港" }, iso: "HK" }),
    CountryModel.create({ code: "36", name: { en: "Hungary", zhHant: "Hungary", zhHans: "Hungary" }, iso: "HU" }),
    CountryModel.create({ code: "354", name: { en: "Iceland", zhHant: "Iceland", zhHans: "Iceland" }, iso: "IS" }),
    CountryModel.create({ code: "91", name: { en: "India", zhHant: "India", zhHans: "India" }, iso: "IN" }),
    CountryModel.create({ code: "62", name: { en: "Indonesia", zhHant: "Indonesia", zhHans: "Indonesia" }, iso: "ID" }),
    CountryModel.create({ code: "98", name: { en: "Iran", zhHant: "Iran", zhHans: "Iran" }, iso: "IR" }),
    CountryModel.create({ code: "964", name: { en: "Iraq", zhHant: "Iraq", zhHans: "Iraq" }, iso: "IQ" }),
    CountryModel.create({ code: "353", name: { en: "Ireland", zhHant: "Ireland", zhHans: "Ireland" }, iso: "IE" }),
    CountryModel.create({
      code: "44-1624",
      name: { en: "Isle of Man", zhHant: "Isle of Man", zhHans: "Isle of Man" },
      iso: "IM",
    }),
    CountryModel.create({ code: "972", name: { en: "Israel", zhHant: "Israel", zhHans: "Israel" }, iso: "IL" }),
    CountryModel.create({ code: "39", name: { en: "Italy", zhHant: "Italy", zhHans: "Italy" }, iso: "IT" }),
    CountryModel.create({
      code: "225",
      name: { en: "Ivory Coast", zhHant: "Ivory Coast", zhHans: "Ivory Coast" },
      iso: "CI",
    }),
    CountryModel.create({ code: "1-876", name: { en: "Jamaica", zhHant: "Jamaica", zhHans: "Jamaica" }, iso: "JM" }),
    CountryModel.create({ code: "81", name: { en: "Japan", zhHant: "Japan", zhHans: "Japan" }, iso: "JP" }),
    CountryModel.create({ code: "44-1534", name: { en: "Jersey", zhHant: "Jersey", zhHans: "Jersey" }, iso: "JE" }),
    CountryModel.create({ code: "962", name: { en: "Jordan", zhHant: "Jordan", zhHans: "Jordan" }, iso: "JO" }),
    CountryModel.create({
      code: "7",
      name: { en: "Kazakhstan", zhHant: "Kazakhstan", zhHans: "Kazakhstan" },
      iso: "KZ",
    }),
    CountryModel.create({ code: "254", name: { en: "Kenya", zhHant: "Kenya", zhHans: "Kenya" }, iso: "KE" }),
    CountryModel.create({ code: "686", name: { en: "Kiribati", zhHant: "Kiribati", zhHans: "Kiribati" }, iso: "KI" }),
    CountryModel.create({ code: "383", name: { en: "Kosovo", zhHant: "Kosovo", zhHans: "Kosovo" }, iso: "XK" }),
    CountryModel.create({ code: "965", name: { en: "Kuwait", zhHant: "Kuwait", zhHans: "Kuwait" }, iso: "KW" }),
    CountryModel.create({
      code: "996",
      name: { en: "Kyrgyzstan", zhHant: "Kyrgyzstan", zhHans: "Kyrgyzstan" },
      iso: "KG",
    }),
    CountryModel.create({ code: "856", name: { en: "Laos", zhHant: "Laos", zhHans: "Laos" }, iso: "LA" }),
    CountryModel.create({ code: "371", name: { en: "Latvia", zhHant: "Latvia", zhHans: "Latvia" }, iso: "LV" }),
    CountryModel.create({ code: "961", name: { en: "Lebanon", zhHant: "Lebanon", zhHans: "Lebanon" }, iso: "LB" }),
    CountryModel.create({ code: "266", name: { en: "Lesotho", zhHant: "Lesotho", zhHans: "Lesotho" }, iso: "LS" }),
    CountryModel.create({ code: "231", name: { en: "Liberia", zhHant: "Liberia", zhHans: "Liberia" }, iso: "LR" }),
    CountryModel.create({ code: "218", name: { en: "Libya", zhHant: "Libya", zhHans: "Libya" }, iso: "LY" }),
    CountryModel.create({
      code: "423",
      name: { en: "Liechtenstein", zhHant: "Liechtenstein", zhHans: "Liechtenstein" },
      iso: "LI",
    }),
    CountryModel.create({
      code: "370",
      name: { en: "Lithuania", zhHant: "Lithuania", zhHans: "Lithuania" },
      iso: "LT",
    }),
    CountryModel.create({
      code: "352",
      name: { en: "Luxembourg", zhHant: "Luxembourg", zhHans: "Luxembourg" },
      iso: "LU",
    }),
    CountryModel.create({ code: "853", name: { en: "Macau", zhHant: "Macau", zhHans: "Macau" }, iso: "MO" }),
    CountryModel.create({
      code: "389",
      name: { en: "Macedonia", zhHant: "Macedonia", zhHans: "Macedonia" },
      iso: "MK",
    }),
    CountryModel.create({
      code: "261",
      name: { en: "Madagascar", zhHant: "Madagascar", zhHans: "Madagascar" },
      iso: "MG",
    }),
    CountryModel.create({ code: "265", name: { en: "Malawi", zhHant: "Malawi", zhHans: "Malawi" }, iso: "MW" }),
    CountryModel.create({ code: "60", name: { en: "Malaysia", zhHant: "Malaysia", zhHans: "Malaysia" }, iso: "MY" }),
    CountryModel.create({ code: "960", name: { en: "Maldives", zhHant: "Maldives", zhHans: "Maldives" }, iso: "MV" }),
    CountryModel.create({ code: "223", name: { en: "Mali", zhHant: "Mali", zhHans: "Mali" }, iso: "ML" }),
    CountryModel.create({ code: "356", name: { en: "Malta", zhHant: "Malta", zhHans: "Malta" }, iso: "MT" }),
    CountryModel.create({
      code: "692",
      name: { en: "Marshall Islands", zhHant: "Marshall Islands", zhHans: "Marshall Islands" },
      iso: "MH",
    }),
    CountryModel.create({
      code: "222",
      name: { en: "Mauritania", zhHant: "Mauritania", zhHans: "Mauritania" },
      iso: "MR",
    }),
    CountryModel.create({
      code: "230",
      name: { en: "Mauritius", zhHant: "Mauritius", zhHans: "Mauritius" },
      iso: "MU",
    }),
    CountryModel.create({ code: "262", name: { en: "Mayotte", zhHant: "Mayotte", zhHans: "Mayotte" }, iso: "YT" }),
    CountryModel.create({ code: "52", name: { en: "Mexico", zhHant: "Mexico", zhHans: "Mexico" }, iso: "MX" }),
    CountryModel.create({
      code: "691",
      name: { en: "Micronesia", zhHant: "Micronesia", zhHans: "Micronesia" },
      iso: "FM",
    }),
    CountryModel.create({ code: "373", name: { en: "Moldova", zhHant: "Moldova", zhHans: "Moldova" }, iso: "MD" }),
    CountryModel.create({ code: "377", name: { en: "Monaco", zhHant: "Monaco", zhHans: "Monaco" }, iso: "MC" }),
    CountryModel.create({ code: "976", name: { en: "Mongolia", zhHant: "Mongolia", zhHans: "Mongolia" }, iso: "MN" }),
    CountryModel.create({
      code: "382",
      name: { en: "Montenegro", zhHant: "Montenegro", zhHans: "Montenegro" },
      iso: "ME",
    }),
    CountryModel.create({
      code: "1-664",
      name: { en: "Montserrat", zhHant: "Montserrat", zhHans: "Montserrat" },
      iso: "MS",
    }),
    CountryModel.create({ code: "212", name: { en: "Morocco", zhHant: "Morocco", zhHans: "Morocco" }, iso: "MA" }),
    CountryModel.create({
      code: "258",
      name: { en: "Mozambique", zhHant: "Mozambique", zhHans: "Mozambique" },
      iso: "MZ",
    }),
    CountryModel.create({ code: "95", name: { en: "Myanmar", zhHant: "Myanmar", zhHans: "Myanmar" }, iso: "MM" }),
    CountryModel.create({ code: "264", name: { en: "Namibia", zhHant: "Namibia", zhHans: "Namibia" }, iso: "NA" }),
    CountryModel.create({ code: "674", name: { en: "Nauru", zhHant: "Nauru", zhHans: "Nauru" }, iso: "NR" }),
    CountryModel.create({ code: "977", name: { en: "Nepal", zhHant: "Nepal", zhHans: "Nepal" }, iso: "NP" }),
    CountryModel.create({
      code: "31",
      name: { en: "Netherlands", zhHant: "Netherlands", zhHans: "Netherlands" },
      iso: "NL",
    }),
    CountryModel.create({
      code: "599",
      name: { en: "Netherlands Antilles", zhHant: "Netherlands Antilles", zhHans: "Netherlands Antilles" },
      iso: "AN",
    }),
    CountryModel.create({
      code: "687",
      name: { en: "New Caledonia", zhHant: "New Caledonia", zhHans: "New Caledonia" },
      iso: "NC",
    }),
    CountryModel.create({
      code: "64",
      name: { en: "New Zealand", zhHant: "New Zealand", zhHans: "New Zealand" },
      iso: "NZ",
    }),
    CountryModel.create({
      code: "505",
      name: { en: "Nicaragua", zhHant: "Nicaragua", zhHans: "Nicaragua" },
      iso: "NI",
    }),
    CountryModel.create({ code: "227", name: { en: "Niger", zhHant: "Niger", zhHans: "Niger" }, iso: "NE" }),
    CountryModel.create({ code: "234", name: { en: "Nigeria", zhHant: "Nigeria", zhHans: "Nigeria" }, iso: "NG" }),
    CountryModel.create({ code: "683", name: { en: "Niue", zhHant: "Niue", zhHans: "Niue" }, iso: "NU" }),
    CountryModel.create({
      code: "850",
      name: { en: "North Korea", zhHant: "North Korea", zhHans: "North Korea" },
      iso: "KP",
    }),
    CountryModel.create({
      code: "1-670",
      name: { en: "Northern Mariana Islands", zhHant: "Northern Mariana Islands", zhHans: "Northern Mariana Islands" },
      iso: "MP",
    }),
    CountryModel.create({ code: "47", name: { en: "Norway", zhHant: "Norway", zhHans: "Norway" }, iso: "NO" }),
    CountryModel.create({ code: "968", name: { en: "Oman", zhHant: "Oman", zhHans: "Oman" }, iso: "OM" }),
    CountryModel.create({ code: "92", name: { en: "Pakistan", zhHant: "Pakistan", zhHans: "Pakistan" }, iso: "PK" }),
    CountryModel.create({ code: "680", name: { en: "Palau", zhHant: "Palau", zhHans: "Palau" }, iso: "PW" }),
    CountryModel.create({
      code: "970",
      name: { en: "Palestine", zhHant: "Palestine", zhHans: "Palestine" },
      iso: "PS",
    }),
    CountryModel.create({ code: "507", name: { en: "Panama", zhHant: "Panama", zhHans: "Panama" }, iso: "PA" }),
    CountryModel.create({
      code: "675",
      name: { en: "Papua New Guinea", zhHant: "Papua New Guinea", zhHans: "Papua New Guinea" },
      iso: "PG",
    }),
    CountryModel.create({ code: "595", name: { en: "Paraguay", zhHant: "Paraguay", zhHans: "Paraguay" }, iso: "PY" }),
    CountryModel.create({ code: "51", name: { en: "Peru", zhHant: "Peru", zhHans: "Peru" }, iso: "PE" }),
    CountryModel.create({
      code: "63",
      name: { en: "Philippines", zhHant: "Philippines", zhHans: "Philippines" },
      iso: "PH",
    }),
    CountryModel.create({ code: "64", name: { en: "Pitcairn", zhHant: "Pitcairn", zhHans: "Pitcairn" }, iso: "PN" }),
    CountryModel.create({ code: "48", name: { en: "Poland", zhHant: "Poland", zhHans: "Poland" }, iso: "PL" }),
    CountryModel.create({ code: "351", name: { en: "Portugal", zhHant: "Portugal", zhHans: "Portugal" }, iso: "PT" }),
    CountryModel.create({
      code: "1-787 1-939",
      name: { en: "Puerto Rico", zhHant: "Puerto Rico", zhHans: "Puerto Rico" },
      iso: "PR",
    }),
    CountryModel.create({ code: "974", name: { en: "Qatar", zhHant: "Qatar", zhHans: "Qatar" }, iso: "QA" }),
    CountryModel.create({
      code: "242",
      name: { en: "Republic of the Congo", zhHant: "Republic of the Congo", zhHans: "Republic of the Congo" },
      iso: "CG",
    }),
    CountryModel.create({ code: "262", name: { en: "Reunion", zhHant: "Reunion", zhHans: "Reunion" }, iso: "RE" }),
    CountryModel.create({ code: "40", name: { en: "Romania", zhHant: "Romania", zhHans: "Romania" }, iso: "RO" }),
    CountryModel.create({ code: "7", name: { en: "Russia", zhHant: "Russia", zhHans: "Russia" }, iso: "RU" }),
    CountryModel.create({ code: "250", name: { en: "Rwanda", zhHant: "Rwanda", zhHans: "Rwanda" }, iso: "RW" }),
    CountryModel.create({
      code: "590",
      name: { en: "Saint Barthelemy", zhHant: "Saint Barthelemy", zhHans: "Saint Barthelemy" },
      iso: "BL",
    }),
    CountryModel.create({
      code: "290",
      name: { en: "Saint Helena", zhHant: "Saint Helena", zhHans: "Saint Helena" },
      iso: "SH",
    }),
    CountryModel.create({
      code: "1-869",
      name: { en: "Saint Kitts and Nevis", zhHant: "Saint Kitts and Nevis", zhHans: "Saint Kitts and Nevis" },
      iso: "KN",
    }),
    CountryModel.create({
      code: "1-758",
      name: { en: "Saint Lucia", zhHant: "Saint Lucia", zhHans: "Saint Lucia" },
      iso: "LC",
    }),
    CountryModel.create({
      code: "590",
      name: { en: "Saint Martin", zhHant: "Saint Martin", zhHans: "Saint Martin" },
      iso: "MF",
    }),
    CountryModel.create({
      code: "508",
      name: {
        en: "Saint Pierre and Miquelon",
        zhHant: "Saint Pierre and Miquelon",
        zhHans: "Saint Pierre and Miquelon",
      },
      iso: "PM",
    }),
    CountryModel.create({
      code: "1-784",
      name: {
        en: "Saint Vincent and the Grenadines",
        zhHant: "Saint Vincent and the Grenadines",
        zhHans: "Saint Vincent and the Grenadines",
      },
      iso: "VC",
    }),
    CountryModel.create({ code: "685", name: { en: "Samoa", zhHant: "Samoa", zhHans: "Samoa" }, iso: "WS" }),
    CountryModel.create({
      code: "378",
      name: { en: "San Marino", zhHant: "San Marino", zhHans: "San Marino" },
      iso: "SM",
    }),
    CountryModel.create({
      code: "239",
      name: { en: "Sao Tome and Principe", zhHant: "Sao Tome and Principe", zhHans: "Sao Tome and Principe" },
      iso: "ST",
    }),
    CountryModel.create({
      code: "966",
      name: { en: "Saudi Arabia", zhHant: "Saudi Arabia", zhHans: "Saudi Arabia" },
      iso: "SA",
    }),
    CountryModel.create({ code: "221", name: { en: "Senegal", zhHant: "Senegal", zhHans: "Senegal" }, iso: "SN" }),
    CountryModel.create({ code: "381", name: { en: "Serbia", zhHant: "Serbia", zhHans: "Serbia" }, iso: "RS" }),
    CountryModel.create({
      code: "248",
      name: { en: "Seychelles", zhHant: "Seychelles", zhHans: "Seychelles" },
      iso: "SC",
    }),
    CountryModel.create({
      code: "232",
      name: { en: "Sierra Leone", zhHant: "Sierra Leone", zhHans: "Sierra Leone" },
      iso: "SL",
    }),
    CountryModel.create({ code: "65", name: { en: "Singapore", zhHant: "Singapore", zhHans: "Singapore" }, iso: "SG" }),
    CountryModel.create({
      code: "1-721",
      name: { en: "Sint Maarten", zhHant: "Sint Maarten", zhHans: "Sint Maarten" },
      iso: "SX",
    }),
    CountryModel.create({ code: "421", name: { en: "Slovakia", zhHant: "Slovakia", zhHans: "Slovakia" }, iso: "SK" }),
    CountryModel.create({ code: "386", name: { en: "Slovenia", zhHant: "Slovenia", zhHans: "Slovenia" }, iso: "SI" }),
    CountryModel.create({
      code: "677",
      name: { en: "Solomon Islands", zhHant: "Solomon Islands", zhHans: "Solomon Islands" },
      iso: "SB",
    }),
    CountryModel.create({ code: "252", name: { en: "Somalia", zhHant: "Somalia", zhHans: "Somalia" }, iso: "SO" }),
    CountryModel.create({
      code: "27",
      name: { en: "South Africa", zhHant: "South Africa", zhHans: "South Africa" },
      iso: "ZA",
    }),
    CountryModel.create({
      code: "82",
      name: { en: "South Korea", zhHant: "South Korea", zhHans: "South Korea" },
      iso: "KR",
    }),
    CountryModel.create({
      code: "211",
      name: { en: "South Sudan", zhHant: "South Sudan", zhHans: "South Sudan" },
      iso: "SS",
    }),
    CountryModel.create({ code: "34", name: { en: "Spain", zhHant: "Spain", zhHans: "Spain" }, iso: "ES" }),
    CountryModel.create({ code: "94", name: { en: "Sri Lanka", zhHant: "Sri Lanka", zhHans: "Sri Lanka" }, iso: "LK" }),
    CountryModel.create({ code: "249", name: { en: "Sudan", zhHant: "Sudan", zhHans: "Sudan" }, iso: "SD" }),
    CountryModel.create({ code: "597", name: { en: "Suriname", zhHant: "Suriname", zhHans: "Suriname" }, iso: "SR" }),
    CountryModel.create({
      code: "47",
      name: { en: "Svalbard and Jan Mayen", zhHant: "Svalbard and Jan Mayen", zhHans: "Svalbard and Jan Mayen" },
      iso: "SJ",
    }),
    CountryModel.create({
      code: "268",
      name: { en: "Swaziland", zhHant: "Swaziland", zhHans: "Swaziland" },
      iso: "SZ",
    }),
    CountryModel.create({ code: "46", name: { en: "Sweden", zhHant: "Sweden", zhHans: "Sweden" }, iso: "SE" }),
    CountryModel.create({
      code: "41",
      name: { en: "Switzerland", zhHant: "Switzerland", zhHans: "Switzerland" },
      iso: "CH",
    }),
    CountryModel.create({ code: "963", name: { en: "Syria", zhHant: "Syria", zhHans: "Syria" }, iso: "SY" }),
    CountryModel.create({ code: "886", name: { en: "Taiwan", zhHant: "Taiwan", zhHans: "Taiwan" }, iso: "TW" }),
    CountryModel.create({
      code: "992",
      name: { en: "Tajikistan", zhHant: "Tajikistan", zhHans: "Tajikistan" },
      iso: "TJ",
    }),
    CountryModel.create({ code: "255", name: { en: "Tanzania", zhHant: "Tanzania", zhHans: "Tanzania" }, iso: "TZ" }),
    CountryModel.create({ code: "66", name: { en: "Thailand", zhHant: "Thailand", zhHans: "Thailand" }, iso: "TH" }),
    CountryModel.create({ code: "228", name: { en: "Togo", zhHant: "Togo", zhHans: "Togo" }, iso: "TG" }),
    CountryModel.create({ code: "690", name: { en: "Tokelau", zhHant: "Tokelau", zhHans: "Tokelau" }, iso: "TK" }),
    CountryModel.create({ code: "676", name: { en: "Tonga", zhHant: "Tonga", zhHans: "Tonga" }, iso: "TO" }),
    CountryModel.create({
      code: "1-868",
      name: { en: "Trinidad and Tobago", zhHant: "Trinidad and Tobago", zhHans: "Trinidad and Tobago" },
      iso: "TT",
    }),
    CountryModel.create({ code: "216", name: { en: "Tunisia", zhHant: "Tunisia", zhHans: "Tunisia" }, iso: "TN" }),
    CountryModel.create({ code: "90", name: { en: "Turkey", zhHant: "Turkey", zhHans: "Turkey" }, iso: "TR" }),
    CountryModel.create({
      code: "993",
      name: { en: "Turkmenistan", zhHant: "Turkmenistan", zhHans: "Turkmenistan" },
      iso: "TM",
    }),
    CountryModel.create({
      code: "1-649",
      name: { en: "Turks and Caicos Islands", zhHant: "Turks and Caicos Islands", zhHans: "Turks and Caicos Islands" },
      iso: "TC",
    }),
    CountryModel.create({ code: "688", name: { en: "Tuvalu", zhHant: "Tuvalu", zhHans: "Tuvalu" }, iso: "TV" }),
    CountryModel.create({
      code: "1-340",
      name: { en: "U.S. Virgin Islands", zhHant: "U.S. Virgin Islands", zhHans: "U.S. Virgin Islands" },
      iso: "VI",
    }),
    CountryModel.create({ code: "256", name: { en: "Uganda", zhHant: "Uganda", zhHans: "Uganda" }, iso: "UG" }),
    CountryModel.create({ code: "380", name: { en: "Ukraine", zhHant: "Ukraine", zhHans: "Ukraine" }, iso: "UA" }),
    CountryModel.create({
      code: "971",
      name: { en: "United Arab Emirates", zhHant: "United Arab Emirates", zhHans: "United Arab Emirates" },
      iso: "AE",
    }),
    CountryModel.create({
      code: "44",
      name: { en: "United Kingdom", zhHant: "United Kingdom", zhHans: "United Kingdom" },
      iso: "GB",
    }),
    CountryModel.create({
      code: "1",
      name: { en: "United States", zhHant: "United States", zhHans: "United States" },
      iso: "US",
    }),
    CountryModel.create({ code: "598", name: { en: "Uruguay", zhHant: "Uruguay", zhHans: "Uruguay" }, iso: "UY" }),
    CountryModel.create({
      code: "998",
      name: { en: "Uzbekistan", zhHant: "Uzbekistan", zhHans: "Uzbekistan" },
      iso: "UZ",
    }),
    CountryModel.create({ code: "678", name: { en: "Vanuatu", zhHant: "Vanuatu", zhHans: "Vanuatu" }, iso: "VU" }),
    CountryModel.create({ code: "379", name: { en: "Vatican", zhHant: "Vatican", zhHans: "Vatican" }, iso: "VA" }),
    CountryModel.create({ code: "58", name: { en: "Venezuela", zhHant: "Venezuela", zhHans: "Venezuela" }, iso: "VE" }),
    CountryModel.create({ code: "84", name: { en: "Vietnam", zhHant: "Vietnam", zhHans: "Vietnam" }, iso: "VN" }),
    CountryModel.create({
      code: "681",
      name: { en: "Wallis and Futuna", zhHant: "Wallis and Futuna", zhHans: "Wallis and Futuna" },
      iso: "WF",
    }),
    CountryModel.create({
      code: "212",
      name: { en: "Western Sahara", zhHant: "Western Sahara", zhHans: "Western Sahara" },
      iso: "EH",
    }),
    CountryModel.create({ code: "967", name: { en: "Yemen", zhHant: "Yemen", zhHans: "Yemen" }, iso: "YE" }),
    CountryModel.create({ code: "260", name: { en: "Zambia", zhHant: "Zambia", zhHans: "Zambia" }, iso: "ZM" }),
    CountryModel.create({ code: "263", name: { en: "Zimbabwe", zhHant: "Zimbabwe", zhHans: "Zimbabwe" }, iso: "ZW" }),
  ]);
}

async function cleanRegionAndLocation() {
  await SfLocatonModel.deleteMany();
  await HkRegionModel.deleteMany();
}

async function addHkRegions() {
  await HkRegionModel.create([
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Kowloon Tong", zhHant: "九龍塘", zhHans: "九龙塘" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Ho Man Tin", zhHant: "何文田", zhHans: "何文田" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Kai Tak", zhHant: "啟德", zhHans: "启德" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "To Kwa Wan", zhHant: "土瓜灣", zhHans: "土瓜湾" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Prince Edward", zhHant: "太子", zhHans: "太子" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Hung Hom", zhHant: "紅磡", zhHans: "红磡" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Whampoa", zhHant: "黃埔", zhHans: "黄埔" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Ma Tau Kok", zhHant: "馬頭角", zhHans: "马头角" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Ma Tau Wai", zhHant: "馬頭圍", zhHans: "马头围" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kowloon City", zhHant: "九龍城", zhHans: "九龙城" },
      sub_district: { en: "Beacon Hill", zhHant: "筆架山", zhHans: "笔架山" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "Tsim Sha Tsui", zhHant: "尖沙咀", zhHans: "尖沙咀" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "Yau Ma Tei", zhHant: "油麻地", zhHans: "油麻地" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "West Kowloon", zhHant: "西九龍", zhHans: "西九龙" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "King's Park", zhHant: "京士柏", zhHans: "京士柏" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "Mong Kok", zhHant: "旺角", zhHans: "旺角" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "Tai Kok Tsui", zhHant: "大角咀", zhHans: "大角咀" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Yau Tsim Mong", zhHant: "油尖旺", zhHans: "油尖旺" },
      sub_district: { en: "Jordan", zhHant: "佐敦", zhHans: "佐敦" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Mei Foo", zhHant: "美孚", zhHans: "美孚" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Lai Chi Kok", zhHant: "荔枝角", zhHans: "荔枝角" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Cheung Sha Wan", zhHant: "長沙灣", zhHans: "长沙湾" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Shek Kip Mei", zhHant: "石硤尾", zhHans: "石硖尾" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Yau Yat Tsuen", zhHant: "又一村", zhHans: "又一村" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Tai Wo Ping", zhHant: "大窩坪", zhHans: "大窝坪" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Stonecutters Island", zhHant: "昂船洲", zhHans: "昂船洲" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Sham Shui Po", zhHant: "深水埗", zhHans: "深水埗" },
      sub_district: { en: "Nam Cheong", zhHant: "南昌", zhHans: "南昌" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Ping Shek", zhHant: "坪石", zhHans: "坪石" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Kowloon Bay", zhHant: "九龍灣", zhHans: "九龙湾" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Ngau Tau Kok", zhHant: "牛頭角", zhHans: "牛头角" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Jordan Valley", zhHant: "佐敦谷", zhHans: "佐敦谷" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Sau Mau Ping", zhHant: "秀茂坪", zhHans: "秀茂坪" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Lam Tin", zhHant: "藍田", zhHans: "蓝田" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Yau Tong", zhHant: "油塘", zhHans: "油塘" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Lei Yue Mun", zhHant: "鯉魚門", zhHans: "鲤鱼门" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "San Po Kong", zhHant: "新蒲崗", zhHans: "新蒲岗" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Tung Tau", zhHant: "東頭", zhHans: "东头" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Wang Tau Hom", zhHant: "橫頭磡", zhHans: "横头磡" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Lok Fu", zhHant: "樂富", zhHans: "乐富" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Diamond Hill", zhHant: "鑽石山", zhHans: "鑽石山" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Tsz Wan Shan", zhHant: "慈雲山", zhHans: "慈云山" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Ngau Chi Wan", zhHant: "牛池灣", zhHans: "牛池湾" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Wong Tai Sin", zhHant: "黃大仙", zhHans: "黄大仙" },
      sub_district: { en: "Choi Hung", zhHant: "彩虹", zhHans: "彩虹" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Hung Shui Kiu", zhHant: "洪水橋", zhHans: "洪水桥" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Ha Tsuen", zhHant: "廈村", zhHans: "厦村" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Lau Fau Shan", zhHant: "流浮山", zhHans: "流浮山" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Tin Shui Wai", zhHant: "天水圍", zhHans: "天水围" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "San Tin", zhHant: "新田", zhHans: "新田" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Lok Ma Chau", zhHant: "落馬洲", zhHans: "落马洲" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Kam Tin", zhHant: "錦田", zhHans: "锦田" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Shek Kong", zhHant: "石崗", zhHans: "石岗" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Pat Heung", zhHant: "八鄉", zhHans: "八乡" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Yuen Long", zhHant: "元朗", zhHans: "元朗" },
      sub_district: { en: "Tuen Mun", zhHant: "屯門", zhHans: "屯门" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Fanling", zhHant: "粉嶺", zhHans: "粉岭" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Luen Wo Hui", zhHant: "聯和墟", zhHans: "联和墟" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Sheung Shui", zhHant: "上水", zhHans: "上水" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Shek Wu Hui", zhHant: "石湖墟", zhHans: "石湖墟" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Sha Tau Kok", zhHant: "沙頭角", zhHans: "沙头角" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Luk Keng", zhHant: "鹿頸", zhHans: "鹿颈" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "North", zhHant: "北區", zhHans: "北区" },
      sub_district: { en: "Wu Kau Tang", zhHant: "烏蛟騰", zhHans: "乌蛟腾" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Tai Po Market", zhHant: "大埔墟", zhHans: "大埔墟" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Tai Po Kau", zhHant: "大埔滘", zhHans: "大埔滘" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Tai Mei Tuk", zhHant: "大尾篤", zhHans: "大尾笃" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Shuen Wan", zhHant: "船灣", zhHans: "船湾" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Cheung Muk Tau", zhHant: "樟木頭", zhHans: "樟木头" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tai Po", zhHant: "大埔", zhHans: "大埔" },
      sub_district: { en: "Kei Ling Ha", zhHant: "企嶺下", zhHans: "企岭下" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
      sub_district: { en: "Tai Wai", zhHant: "大圍", zhHans: "大围" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
      sub_district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
      sub_district: { en: "Fo Tan", zhHant: "火炭", zhHans: "火炭" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
      sub_district: { en: "Ma Liu Shui", zhHant: "馬料水", zhHans: "马料水" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
      sub_district: { en: "Wu Kai Sha", zhHant: "烏溪沙", zhHans: "乌溪沙" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sha Tin", zhHant: "沙田", zhHans: "沙田" },
      sub_district: { en: "Ma On Shan", zhHant: "馬鞍山", zhHans: "马鞍山" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Lei Muk Shue", zhHant: "梨木樹", zhHans: "梨木树" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Ting Kau", zhHant: "汀九", zhHans: "汀九" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Sham Tseng", zhHant: "深井", zhHans: "深井" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Tsing Lung Tau", zhHant: "青龍頭", zhHans: "青龙头" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Ma Wan", zhHant: "馬灣", zhHans: "马湾" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Sunny Bay", zhHant: "欣澳", zhHans: "欣澳" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Tsuen Wan", zhHant: "荃灣", zhHans: "荃湾" },
      sub_district: { en: "Tai Wo Hau", zhHant: "大窩口", zhHans: "大窝口" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Kwai Tsing", zhHant: "葵青", zhHans: "葵青" },
      sub_district: { en: "Lai King", zhHant: "荔景", zhHans: "荔景" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Kwai Tsing", zhHant: "葵青", zhHans: "葵青" },
      sub_district: { en: "Kwai Chung", zhHant: "葵涌", zhHans: "葵涌" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Kwai Tsing", zhHant: "葵青", zhHans: "葵青" },
      sub_district: { en: "Kwai Fong", zhHant: "葵芳", zhHans: "葵芳" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Kwai Tsing", zhHant: "葵青", zhHans: "葵青" },
      sub_district: { en: "Tsing Yi", zhHant: "青衣", zhHans: "青衣" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Clear Water Bay", zhHant: "清水灣", zhHans: "清水湾" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Tai Mong Tsai", zhHant: "大網仔", zhHans: "大网仔" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Tseung Kwan O", zhHant: "將軍澳", zhHans: "将军澳" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Hang Hau", zhHant: "坑口", zhHans: "坑口" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Tiu Keng Leng", zhHant: "調景嶺", zhHans: "调景岭" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Ma Yau Tong", zhHant: "馬游塘", zhHans: "马游塘" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Kennedy Town", zhHant: "堅尼地城", zhHans: "坚尼地城" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Shek Tong Tsui", zhHant: "石塘咀", zhHans: "石塘咀" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Sai Ying Pun", zhHant: "西營盤", zhHans: "西营盘" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Sheung Wan", zhHant: "上環", zhHans: "上环" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Central", zhHant: "中環", zhHans: "中环" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Admiralty", zhHant: "金鐘", zhHans: "金钟" },
    },
    // there are 2 金鐘 that are very similar in character, but they are different
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Admiralty", zhHant: "金鍾", zhHans: "金钟" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Mid-levels", zhHant: "半山區", zhHans: "半山区" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Peak", zhHant: "山頂", zhHans: "山顶" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Pok Fu Lam", zhHant: "薄扶林", zhHans: "薄扶林" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Aberdeen", zhHant: "香港仔", zhHans: "香港仔" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Ap Lei Chau", zhHant: "鴨脷洲", zhHans: "鸭脷洲" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Wong Chuk Hang", zhHant: "黃竹坑", zhHans: "黄竹坑" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Shouson Hill", zhHant: "壽臣山", zhHans: "寿臣山" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Repulse Bay", zhHant: "淺水灣", zhHans: "浅水湾" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Chung Hom Kok", zhHant: "舂磡角", zhHans: "舂磡角" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Stanley", zhHant: "赤柱", zhHans: "赤柱" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Tai Tam", zhHant: "大潭", zhHans: "大潭" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Southern", zhHant: "南區", zhHans: "南区" },
      sub_district: { en: "Shek O", zhHant: "石澳", zhHans: "石澳" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Tin Hau", zhHant: "北角", zhHans: "北角" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Braemar Hill", zhHant: "天后", zhHans: "天后" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "North Point", zhHant: "太古", zhHans: "太古" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Quarry Bay", zhHant: "小西灣", zhHans: "小西湾" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Sai Wan Ho", zhHant: "柴灣", zhHans: "柴湾" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Shau Kei Wan", zhHant: "石澳", zhHans: "石澳" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Chai Wan", zhHant: "筲箕灣", zhHans: "筲箕湾" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Siu Sai Wan", zhHant: "西灣河", zhHans: "西湾河" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Quarry Bay", zhHant: "鰂魚涌", zhHans: "鰂鱼涌" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Braemar Hill", zhHant: "寶馬山", zhHans: "宝马山" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Wan Chai", zhHant: "灣仔", zhHans: "湾仔" },
      sub_district: { en: "Wan Chai", zhHant: "大坑", zhHans: "大坑" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Wan Chai", zhHant: "灣仔", zhHans: "湾仔" },
      sub_district: { en: "Causeway Bay", zhHant: "跑馬地", zhHans: "跑马地" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Wan Chai", zhHant: "灣仔", zhHans: "湾仔" },
      sub_district: { en: "Happy Valley", zhHant: "銅鑼灣", zhHans: "铜锣湾" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Wan Chai", zhHant: "灣仔", zhHans: "湾仔" },
      sub_district: { en: "Tai Hang", zhHant: "灣仔", zhHans: "湾仔" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Wan Chai", zhHant: "灣仔", zhHans: "湾仔" },
      sub_district: { en: "So Kon Po", zhHant: "掃桿埔", zhHans: "扫杆埔" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Wan Chai", zhHant: "灣仔", zhHans: "湾仔" },
      sub_district: { en: "Jardine's Lookout", zhHant: "渣甸山", zhHans: "渣甸山" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Tai O", zhHant: "大澳", zhHans: "大澳" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Discovery Bay", zhHant: "愉景灣", zhHans: "愉景湾" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Tung Chung", zhHant: "東涌", zhHans: "东涌" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Pui O", zhHant: "貝澳", zhHans: "贝澳" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Peng Chau", zhHant: "坪洲", zhHans: "坪洲" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Lantau Island", zhHant: "大嶼山", zhHans: "大屿山" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Cheung Chau", zhHant: "長洲", zhHans: "长洲" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Lamma Island", zhHant: "南丫島", zhHans: "南丫岛" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Mui Wo", zhHant: "梅窩", zhHans: "梅窝" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Islands", zhHant: "離島", zhHans: "离岛" },
      sub_district: { en: "Chek Lap Kok", zhHant: "赤鱲角", zhHans: "赤鱲角" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Sai Wan", zhHant: "西環", zhHans: "西环" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Heng Fa Chuen", zhHant: "杏花邨", zhHans: "杏花邨" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Central and Western", zhHant: "中西區", zhHans: "中西区" },
      sub_district: { en: "Mid-levels", zhHant: "半山", zhHans: "半山" },
    },
    {
      region: { en: "Kowloon", zhHant: "九龍", zhHans: "九龙" },
      district: { en: "Kwun Tong", zhHant: "觀塘", zhHans: "观塘" },
      sub_district: { en: "Kwun Tong", zhHant: "觀塘區", zhHans: "观塘区" },
    },
    {
      region: { en: "New Territories", zhHant: "新界", zhHans: "新界" },
      district: { en: "Sai Kung", zhHant: "西貢", zhHans: "西贡" },
      sub_district: { en: "Lohas", zhHant: "康城", zhHans: "康城" },
    },
    {
      region: { en: "Hong Kong", zhHant: "港島", zhHans: "港岛" },
      district: { en: "Eastern", zhHant: "東區", zhHans: "东区" },
      sub_district: { en: "Fortress Hill", zhHant: "炮台山", zhHans: "炮台山" },
    },
  ]);
}

async function createSfLocations() {
  const content = await fs.readFile(path.join("./data/sf-her-output-utf8.json"), { encoding: "utf-8" });
  const records = JSON.parse(content) as SfLocationPoJo[];
  for (const record of records) {
    record.sub_district = record.sub_district.trim();
  }
  await SfLocatonModel.insertMany(records);

  // current database has sfSubdistricts set to zhHant default
  //   await updateSfLocationSubDistrictsToEn();
}

// async function updateSfLocationSubDistrictsToEn() {
//   const locations = await SfLocatonModel.find().lean();

//   for (const location of locations) {
//     const region = await HkRegionModel.findOne({
//       "sub_district.zhHant": location.sub_district,
//     }).lean();

//     if (!region) {
//       console.log("no region", location);
//       continue;
//     }

//     await SfLocatonModel.updateOne(
//       { _id: location._id },
//       {
//         $set: {
//           sub_district: region.sub_district.en,
//         },
//       }
//     );
//   }
// }

export default {
  createShopAttilio,
  createOfficeman,
  createMultiMerchant,
  addCountryList,
  addHkRegions,
  createSfLocations,
  cleanRegionAndLocation,
};
