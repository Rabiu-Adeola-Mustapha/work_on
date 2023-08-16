import Debug from "debug";
import express from "express";
import { body, query } from "express-validator";

import shopId from "../middleware/shopId.mw";
import { validateResult } from "../middleware/validator.mw";
import AttributeModel, { AttributeDocLean } from "../models/attribute.model";

// eslint-disable-next-line
const debug = Debug("project:adminAttribute");

const list = [
  shopId,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const record = await AttributeModel.find({
        shop_id: req.shop._id,
      }).lean();

      res.json(record.map(responseAttribute));
    } catch (e) {
      next(e);
    }
  },
];

const get = [
  shopId,
  query("id").isMongoId().exists().withMessage("Invalid id"),
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const record = await AttributeModel.findOne({
        _id: req.data.id,
        shop_id: req.shop._id,
      }).lean();

      res.json(responseAttribute(record));
    } catch (e) {
      next(e);
    }
  },
];

const attributeValidators = [
  body("code").isString().withMessage("invalid code"),
  body("name.en").isString().optional().withMessage("Invalid name.en"),
  body("name.zhHant").isString().optional().withMessage("Invalid name.zhHant"),
  body("name.zhHans").isString().optional().withMessage("Invalid name.zhHans"),
  body("type").isIn(["string", "number"]).exists().withMessage("Invalid type"),
  body("unit").if(body("type").equals("number")).exists().withMessage("unit must be provided with type='number'"),
  body("unit.en").isString().optional().withMessage("Invalid unit.en"),
  body("unit.zhHant").isString().optional().withMessage("Invalid unit.zhHant"),
  body("unit.zhHans").isString().optional().withMessage("Invalid unit.zhHans"),
];

const create = [
  shopId,
  ...attributeValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const record = await AttributeModel.create({
        shop_id: req.shop._id,
        code: (req.data.code as string).toLowerCase(),
        name: req.data.name,
        type: req.data.type,
        unit: req.data.unit,
        created_by: req.adminUser._id,
      });

      res.json(responseAttribute(record));
    } catch (e) {
      next(e);
    }
  },
];

const update = [
  shopId,
  body("id").isMongoId().withMessage("Invalid id"),
  ...attributeValidators,
  validateResult,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const status = await AttributeModel.updateOne({
        _id: req.data.id,
        shop_id: req.shop._id,
        code: (req.data.code as string).toLowerCase(),
        name: req.data.name,
        type: req.data.type,
        unit: req.data.unit,
        created_by: req.adminUser._id,
      });

      if (status.modifiedCount === 1) {
        return res.json({
          message: "udpated",
        });
      }

      console.error(status);

      res.status(401).json({ message: "failed" });
    } catch (e) {
      next(e);
    }
  },
];

function responseAttribute(attribute: AttributeDocLean) {
  return {
    code: attribute.code,
    name: attribute.name,
    id: attribute._id,
    type: attribute.type,
    unit: attribute.unit,
  };
}

export default {
  create,
  list,
  get,
  update,
};
