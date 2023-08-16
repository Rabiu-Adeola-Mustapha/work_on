import express from "express";
import { matchedData, validationResult } from "express-validator";

export async function validateResult(req: express.Request, res: express.Response, next: express.NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = { errors: errors.mapped() };
    console.error(msg);
    return res.status(422).json(msg);
  }

  req.data = matchedData(req);
  next();
}
