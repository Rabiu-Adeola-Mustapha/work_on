import Debug from "debug";
import express from "express";

// eslint-disable-next-line
const debug = Debug("project:currency.mw");

export default async function currency(req: express.Request, res: express.Response, next: express.NextFunction) {
  const currency = req.headers.currency as string;

  if (currency) {
    req.currency = currency;
  }

  next();
}
