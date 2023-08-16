import crypto from "crypto";

import Debug from "debug";
import nodemailer from "nodemailer";

import AdminUserModel, { AdminUserDocLean, AdminUserStatus, AdminUserType } from "../models/adminUser.model";
import MailModel from "../models/mail.model";
import adminUserUtil from "../utils/adminUser.utils";
import Config from "../utils/config";

// eslint-disable-next-line
const debug = Debug("project:adminUser.core");

async function addUserCreateNew(email: string) {
  const uuid = crypto.randomUUID();

  const createdAdminUser = await AdminUserModel.create({
    type: AdminUserType.regular,
    email,
    email_verification_code: uuid,
    status: AdminUserStatus.pending,
    internal_password: adminUserUtil.randomInternalPassword(),
  });

  await emailInvitation(createdAdminUser);

  return createdAdminUser;
}

async function resendInvitation(email: string) {
  const adminUser = await AdminUserModel.findOne({
    email,
  }).lean();

  await emailInvitation(adminUser);
}

async function emailInvitation(user: AdminUserDocLean) {
  debug("emailInvitation", user);
  const url = `${Config.adminFrontUrl}/user/verify?emailVerificationCode=${user.email_verification_code}&userId=${
    user._id.toString() as string
  }`;
  const msgHtml = `Your registration link is:<br /><a href="${url}">${url}</a>`;

  const transporter = nodemailer.createTransport(Config.smtp);
  const mailOptions = {
    from: Config.smtpFrom,
    to: user.email,
    subject: "You Are Invitied To Join HER ✔",
    html: msgHtml,
  };

  const mail = await MailModel.create({
    adminUserId: user._id,
    message: mailOptions,
    mailType: "adminUserRegistration",
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

async function requestResetPwd(email: string) {
  const code = crypto.randomUUID();
  const adminUser = await AdminUserModel.findOneAndUpdate(
    {
      email,
    },
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

  if (adminUser === null || adminUser === undefined) {
    return {
      rst: false,
      message: "noUser",
    };
  }

  await sendResetPwdEmail(adminUser);

  return { rst: true };
}

async function sendResetPwdEmail(adminUser: AdminUserDocLean) {
  const url = `${Config.adminFrontUrl}/user/resetPwd?code=${adminUser.resetPwCode}&userId=${
    adminUser._id.toString() as string
  }`;
  const msgHtml = `Click below link to reset your password:<br /><a href="${url}">${url}</a>`;

  const transporter = nodemailer.createTransport(Config.smtp);
  const mailOptions = {
    from: Config.smtpFrom,
    to: adminUser.email,
    subject: "Reset Your HER Password 👢",
    html: msgHtml,
  };

  const mail = await MailModel.create({
    adminUserId: adminUser._id,
    message: mailOptions,
    mailType: "resetPwd",
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
  addUserCreateNew,
  resendInvitation,
  requestResetPwd,
};
