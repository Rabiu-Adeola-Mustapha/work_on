import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import mailCore from "../core/mail.core";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import { MailType } from "../models/mail.model";
import MailTemplateModel, { MailTemplateDocLean } from "../models/mailTemplate.model";
import handleBarsUtil from "../utils/handleBars.util";

// eslint-disable-next-line
const debug = Debug("project:adminMedia.service");

const list = [
  shopIdMw,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const templates = await MailTemplateModel.find({ shopId: req.shop._id });
      res.json(templates.map((t) => mailTemplateRes(t)));
    } catch (e) {
      next(e);
    }
  },
];

const get = [
  shopIdMw,
  query("templateId").exists().isMongoId().withMessage("Missing id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const template = await MailTemplateModel.findById({
        _id: req.data.templateId,
      });

      const htmlTemplate = handleBarsUtil.compileHtml(template.body);
      const html = htmlTemplate(mailData);

      res.json({ html, ...mailTemplateRes(template) });
    } catch (e) {
      next(e);
    }
  },
];

const update = [
  shopIdMw,
  query("templateId").exists().isMongoId().withMessage("Missing templateId"),
  body("body").isString().withMessage("invalid body"),
  body("subject").isString().withMessage("invalid subject"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const template = await MailTemplateModel.findOneAndUpdate(
        {
          _id: req.data.templateId,
          shopId: req.shop._id,
        },
        {
          $set: {
            body: req.data.body,
            subject: req.data.subject,
          },
        }
      );
      res.json(template);
    } catch (e) {
      next(e);
    }
  },
];

const test = [
  shopIdMw,
  query("templateId").exists().isMongoId().withMessage("Missing id"),
  body("recipientEmail").isString().withMessage("missing recipientEmail"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const template = await MailTemplateModel.findById({
        _id: req.data.templateId,
      });

      // TODO: figure out relationship between mailType and mailTemplate Type:
      // how can we decouple mail storage in the database from mailType? should we?
      const options = {
        templateType: template.templateType,
        mailType: "orderCreatedNotify" as MailType,
        data: mailData,
        shopId: req.shop._id,
        receiver: { email: req.data.recipientEmail },
      };

      await mailCore.sendMailWithTemplate(options);
    } catch (e) {
      next(e);
    }
  },
];

const mailTemplateRes = (template: MailTemplateDocLean) => {
  return {
    id: template._id,
    body: template.body,
    subject: template.subject,
    templateType: template.templateType,
  };
};

const mailData = {
  primaryColor: "#00a79d",
  orderNumber: "ON02293",
  subject: "order created successfully",
  userName: "Favour",
};

export default { list, get, update, test };
