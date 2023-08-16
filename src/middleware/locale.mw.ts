import Debug from "debug";
import express from "express";

// eslint-disable-next-line
const debug = Debug("project:locale.mw");

export default async function locale(req: express.Request, res: express.Response, next: express.NextFunction) {
  const locale = req.headers.locale as string;

  if (locale) {
    req.locale = locale;
  }

  next();
}
