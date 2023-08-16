import axios from "axios";
import Debug from "debug";
import mongoose from "mongoose";

import ShopModel, { ShopDocLean } from "../models/shop.model";
import { UserDocLean } from "../models/user.model";

// eslint-disable-next-line
const debug = Debug("project:sms.service");

const url = "https://vercode.accessyou-anyip.com/sms/sendsms-vercode.php";

async function sendSms(shopUser: UserDocLean, shopId: mongoose.Types.ObjectId) {
  // don't send it in test
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const shop = await ShopModel.findById(shopId).lean();

  // encodeURIComponent takes care of all below cases as required by accessyou:
  // 1. line break to  %0A
  // 2. space to %20
  // 3. UTf-8 encoding
  const msg = shop.otpMsg.replaceAll("{otp}", shopUser.sms_otp);

  await send(shop, shopUser, msg);
}

async function sendSmsUpdating(shopUser: UserDocLean, shopId: mongoose.Types.ObjectId) {
  // don't send it in test
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const shop = await ShopModel.findById(shopId).lean();

  // encodeURIComponent takes care of all below cases as required by accessyou:
  // 1. line break to  %0A
  // 2. space to %20
  // 3. UTf-8 encoding
  const msg = shop.otpMsg.replaceAll("{otp}", shopUser.updating_sms_otp);

  await send(shop, shopUser, msg);
}

async function send(shop: ShopDocLean, shopUser: UserDocLean, msg: string) {
  const encodedMsg = encodeURIComponent(msg);

  const requestUrl = `${url}?accountno=${shop.accessYouAcctNo}&user=${shop.accessYouUser}&msg=${encodedMsg}&pwd=${shop.accessYouPw}&phone=${shopUser.mobile_number}`;

  await axios.get(requestUrl, {
    withCredentials: true,
    headers: {
      // this cookies bypass IP whitelisting, also need to be enabled from Access You by email request
      Cookie: "dynamic=vercode",
    },
  });
}

export default { sendSms, sendSmsUpdating };
