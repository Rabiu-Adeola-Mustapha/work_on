import Debug from "debug";
import express from "express";
import mongoose from "mongoose";

import counterCore from "../core/counter.core";
import verifyTestCode from "../middleware/verityTestCode.mw";
import MailModel from "../models/mail.model";
import ProductModel from "../models/product.model";
import { removeAllFrontUsers, testInitStart } from "../tasks/taskStart";

const debug = Debug("project:testInit");

const testInit = [
  verifyTestCode,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      debug("testInit");
      // console.log("query", req.query);

      await testInitStart();
      res.status(200).end();
    } catch (e) {
      next(e);
    }
  },
];

const cleanFrontUsers = [
  verifyTestCode,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      await removeAllFrontUsers();
      res.status(200).end();
    } catch (e) {
      next(e);
    }
  },
];

const getLastMails = [
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const mail = await MailModel.find() //
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      res.json(mail);
    } catch (e) {
      next(e);
    }
  },
];

const clone100Products = [
  verifyTestCode,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const product = await ProductModel.findOne().lean();

      for (let i = 0; i < 100; i++) {
        const newProduct = { ...product };

        delete newProduct._id;
        delete newProduct.product_number;

        const sequence = await counterCore.getNextSequence(product.shop_id as mongoose.Types.ObjectId, "product");
        newProduct.product_number = sequence;

        newProduct.name = {
          en: product.name.en + `(${i})`,
          zhHant: product.name.zhHant + `(${i})`,
          zhHans: product.name.zhHans + `(${i})`,
        };
        newProduct.sku = `clone_${i}`;

        await ProductModel.create(newProduct);
      }

      res.status(200).json({ message: "success" });
    } catch (e) {
      next(e);
    }
  },
];

export default {
  testInit,
  cleanFrontUsers,
  getLastMails,
  clone100Products,
};
