import crypto from "crypto";

import Debug from "debug";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

import { LocaleOption } from "../models/locale.model";
import MailModel from "../models/mail.model";
import { ShopDocLean } from "../models/shop.model";
import UserModel, { UserDoc, UserDocLean } from "../models/user.model";

// eslint-disable-next-line
const debug = Debug("project:frontUser.core");

async function requestResetPwd(shop: ShopDocLean, email: string) {
  const frontUser = await setResetPwdToUser({
    shop_id: shop._id,
    email,
  });

  if (frontUser === null || frontUser === undefined) {
    return {
      rst: false,
      message: "noUser",
    };
  }

  if (frontUser === null || frontUser === undefined) {
    return {
      rst: false,
      message: "noUser",
    };
  }

  await sendResetPwdEmail(shop, frontUser);

  return { rst: true };
}

async function setResetPwdToUser(filter?: mongoose.FilterQuery<UserDoc>) {
  const code = crypto.randomUUID();
  return await UserModel.findOneAndUpdate(
    filter,
    {
      $set: {
        resetPwCode: code,
        resetPwCodeDate: new Date(),
      },
    },
    {
      new: true,
    }
  ).lean();
}

function getShopName(shop: ShopDocLean) {
  switch (shop.default_locale) {
    case LocaleOption.en:
      return shop.name.en;
    case LocaleOption.zhHant:
      return shop.name.zhHant;
    case LocaleOption.zhHans:
      return shop.name.zhHans;
  }
}

function getSubject(shop: ShopDocLean) {
  switch (shop.default_locale) {
    case LocaleOption.en:
      return `Reset Your ${getShopName(shop)} Password`;
    case LocaleOption.zhHant:
      return `重設您的${getShopName(shop)}密碼`;
    case LocaleOption.zhHans:
      return `重设您的${getShopName(shop)}密码`;
  }
}

function getBody(shop: ShopDocLean, url: string) {
  switch (shop.default_locale) {
    case LocaleOption.en:
      return `Click below link to reset your password:<br /><a href="${url}">${url}</a>`;
    case LocaleOption.zhHant:
      return `點擊以下鏈接重置您的密碼：<br /><a href="${url}">${url}</a>`;
    case LocaleOption.zhHans:
      return `点击以下链接重置您的密码：<br /><a href="${url}">${url}</a>`;
  }
}

function getResetPwdUrl(shop: ShopDocLean, frontUser: UserDocLean) {
  return `${shop.root_url}auth/resetPwd?code=${frontUser.resetPwCode}&userId=${frontUser._id.toString() as string}`;
}

async function sendResetPwdEmail(shop: ShopDocLean, frontUser: UserDocLean) {
  const url = getResetPwdUrl(shop, frontUser);

  const transporter = nodemailer.createTransport(shop.smtp_transport);
  const mailOptions = {
    from: shop.smtp_from,
    to: frontUser.email,
    subject: getSubject(shop),
    html: getBody(shop, url),
  };

  const mail = await MailModel.create({
    userId: frontUser._id,
    message: mailOptions,
    mailType: "frontResetPwd",
  });

  // send email
  transporter
    .sendMail(mailOptions)
    .then(async (info) => {
      await MailModel.findOneAndUpdate(
        { _id: mail._id },
        {
          $set: {
            sentInfo: info,
          },
        }
      );
    })
    .catch(async (e) => {
      console.error(e);
      await MailModel.findOneAndUpdate(
        { _id: mail._id },
        {
          $set: {
            sentInfo: e,
          },
        }
      );
    });
}

export default {
  getResetPwdUrl,
  setResetPwdToUser,
  requestResetPwd,
};
