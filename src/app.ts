import "source-map-support/register";

import express from "express";

import dbInit from "./init/dbInit";
import expressInit from "./init/expressInit";
import testInit from "./init/testInit";

const app = express();

async function start() {
  await dbInit.connect();
  expressInit.setupExpress(app);

  await testInit.setTestMailer();
}

export const startPromise = start();

// .then(() => {
//   console.log("App started");
// })
// .catch((e) => {
//   console.error("App failed to start");
//   console.error(e);
// });

export default app;
