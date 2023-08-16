import cors from "cors";
import express, { Express } from "express";
import morgan from "morgan";

import adminAuthMw from "../middleware/adminAuth.mw";
import adminRoute from "../routes/adminRoute";
import route from "../routes/route";
import testRoute from "../routes/testRoute";

function middlewareNotFound(req: express.Request, res: express.Response, next: express.NextFunction) {
  const err = new Error("Not Found: " + req.url) as any;
  err.status = 404;
  next(err);
}

function middlewareError(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  console.error("500 Error", err);

  res.status(err.status || 500);
  res.json({
    status: err.status || 500,
    message: err.message,
  });
}

function setupExpress(app: Express) {
  console.log("Start Setting Up Express");

  app.disable("x-powered-by");
  app.use(morgan("dev"));

  app.use(
    express.json({
      limit: "50mb",
      verify: (req, res, buf, encoding) => {
        req.rawBody = buf.toString();
      },
    })
  );

  app.use(cors());

  const port = normalizePort(process.env.PORT || "5001");

  app.use("/public", route);
  app.use("/admin", [adminAuthMw, adminRoute]);

  if (process.env.NODE_ENV === "test") {
    app.use("/test", testRoute);
  }

  app.use(middlewareNotFound);
  app.use(middlewareError);

  app.listen(port, () => {
    console.log(`Express start listening to port: ${port.toString()}`);
  });

  console.log("finish setting up Express");
  return app;
}

function normalizePort(val: string) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

export default {
  setupExpress,
};
