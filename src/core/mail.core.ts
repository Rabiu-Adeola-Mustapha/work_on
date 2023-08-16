import Debug from "debug";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import MailModel, { MailType } from "../models/mail.model";
import MailTemplateModel from "../models/mailTemplate.model";
import OrderModel from "../models/order.model";
import Config from "../utils/config";
import handleBarsUtil from "../utils/handleBars.util";

// eslint-disable-next-line
const debug = Debug("project:mail.core");

async function sendMail(option: {
  mailType: MailType;
  mailOptions: Mail.Options;
  shopId: mongoose.Types.ObjectId;
  logOrderId?: mongoose.Types.ObjectId;
}) {
  const transporter = nodemailer.createTransport(Config.smtp);
  const mailOptions: Mail.Options = {
    ...option.mailOptions,
    from: Config.smtpFrom,
    //  to: "aptly@inbound.devmail.email",
  };

  const mail = await MailModel.create({
    shopId: option.shopId,
    message: mailOptions,
    mailType: option.mailType,
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

      await OrderModel.findOneAndUpdate(
        { _id: option.logOrderId },
        {
          $push: {
            logs: {
              changeType: "mailSent",
              prevValue: "System",
              newValue: { id: mail._id, to: mailOptions.to, type: option.mailType },
            },
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

      await OrderModel.findOneAndUpdate(
        { _id: option.logOrderId },
        {
          $push: {
            logs: {
              changeType: "mailError",
              prevValue: "System",
              newValue: { id: mail._id, to: mailOptions.to, type: option.mailType },
            },
          },
        }
      );
    });
}

async function sendMailWithTemplate(option: {
  templateType: string;
  mailType: MailType;
  data: any;
  shopId: mongoose.Types.ObjectId;
  logOrderId?: mongoose.Types.ObjectId;
  receiver: { email: string | string[] };
}) {
  const { mailType, shopId, logOrderId, templateType, receiver } = option;

  const mailTemplate = await MailTemplateModel.findOne({ shopId, templateType });

  const htmlTemplate = handleBarsUtil.compileHtml(mailTemplate.body);
  const html = htmlTemplate(option.data);

  const mailOptions: Mail.Options = {
    to: receiver.email,
    subject: mailTemplate.subject,
    html,
  };

  await sendMail({ mailType, mailOptions, shopId, logOrderId });
}

export default {
  sendMail,
  sendMailWithTemplate,
};

// const transporter = nodemailer.createTransport({
//   host: "smtp.devmail.email",
//   port: 25,
//   auth: {
//     user: "aptly",
//     pass: "iKIBLqrchzc5aHv4TEeV",
//   },
//   tls: {
//     ciphers: "SSLv3",
//   },
// });
