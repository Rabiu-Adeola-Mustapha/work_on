import type express from "express";

export default async function verifyTestCode(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.query.specialCode !== "wERKJFDkewdso34S!8s") {
    console.error("wrong specialCode", req.query);
    res.status(401).end();
    return;
  }

  next();
}
