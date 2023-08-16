import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import shopIdMw from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import FormDefModel, { FormDefDocLean } from "../models/formDef.model";
import FormDocModel, { FormDocDocLean } from "../models/formDoc.model";

// eslint-disable-next-line
const debug = Debug("project:adminForm.service");

const listDef = [
  shopIdMw,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const formDefs = await FormDefModel.find({
        shopId: req.shop._id,
      }).lean();

      res.json(formDefs.map(resFormDef));
    } catch (e) {
      next(e);
    }
  },
];

const singleDef = [
  shopIdMw,
  query("formDefId").isMongoId().withMessage("invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const formDef = await FormDefModel.findOne({
        shopId: req.shop._id,
        _id: req.data.formDefId,
      }).lean();

      res.json(resFormDef(formDef));
    } catch (e) {
      next(e);
    }
  },
];

function resFormDef(formDoc: FormDefDocLean) {
  return {
    id: formDoc._id,
    code: formDoc.code,
    notifyEmails: formDoc.notifyEmails,
    createdAt: formDoc.createdAt,
  };
}

const createDef = [
  shopIdMw,
  body("code").isString().withMessage("Invalid code"),
  body("notifyEmails").isArray().optional().withMessage("Invalid notifyEmails"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await FormDefModel.create({
        shopId: req.shop._id,
        code: req.data.code,
        notifyEmails: req.data.notifyEmails,
      });

      res.json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

const updateDef = [
  shopIdMw,
  body("formDefId").isMongoId().withMessage("Invalid formDefId"),
  body("code").isString().withMessage("Invalid code"),
  body("notifyEmails").isArray().optional().withMessage("Invalid notifyEmails"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const updateRst = await FormDefModel.updateOne(
        {
          shopId: req.shop._id,
          _id: req.data.formDefId,
        },
        {
          $set: {
            code: req.data.code,
            notifyEmails: req.data.notifyEmails,
          },
        }
      ).lean();

      if (updateRst.matchedCount === 1) {
        return res.json({ message: "success" });
      }

      res.status(500).json({
        message: "failed",
        rst: updateRst,
      });
    } catch (e) {
      next(e);
    }
  },
];

const listDoc = [
  shopIdMw,
  query("formDefId").isMongoId().withMessage("invalid formDefId"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const formDocs = await FormDocModel.find({
        shopId: req.shop._id,
        formDefId: req.data.formDefId,
      }).lean();

      res.json(formDocs.map(resFormDoc));
    } catch (e) {
      next(e);
    }
  },
];

const singleDoc = [
  shopIdMw,
  query("id").isMongoId().withMessage("invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const formDoc = await FormDocModel.findOne({
        shopId: req.shop._id,
        _id: req.query.id,
      }).lean();

      res.json(resFormDoc(formDoc));
    } catch (e) {
      next(e);
    }
  },
];

function resFormDoc(formDoc: FormDocDocLean) {
  return {
    id: formDoc._id,
    formDefId: formDoc.formDefId,
    body: formDoc.body,
    createdAt: formDoc.createdAt,
  };
}

export default {
  listDef,
  listDoc,
  singleDef,
  singleDoc,
  updateDef,
  createDef,
};
