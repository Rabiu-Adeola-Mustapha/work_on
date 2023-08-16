import express from "express";
import { body } from "express-validator";

import mailCore from "../core/mail.core";
import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import FormDefModel, { FormDefDocLean } from "../models/formDef.model";
import FormDocModel from "../models/formDoc.model";

const send = [
  shopIdMw,
  body("code").isString().withMessage("invalid formCode"),
  body("body").isObject().withMessage("missing body"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const formDef = await getFormDef(req);

      await FormDocModel.create({
        shopId: req.shop._id,
        formDefId: formDef._id,
        body: req.data.body,
      });

      if (formDef.notifyEmails && formDef.notifyEmails.length > 0) {
        // disable the warning for not setting await
        // we want to keep it async!
        // eslint-disable-next-line
        const promise = mailCore.sendMail({
          mailType: "formSubmitNotify",
          shopId: req.shop._id,
          mailOptions: {
            to: formDef.notifyEmails,
            subject: `Form Submitted: '${formDef.code}'`,
            html: "<h1>Hi</h1>",
          },
        });

        if (process.env.NODE_ENV === "test") {
          await promise;
        }
      }

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

async function getFormDef(req: express.Request): Promise<FormDefDocLean> {
  const formDef = await FormDefModel.findOne({
    shopId: req.shop._id,
    code: req.body.code,
  });

  if (formDef) return formDef;

  return await FormDefModel.create({
    shopId: req.shop._id,
    code: req.body.code,
  });
}

export default {
  send,
};
