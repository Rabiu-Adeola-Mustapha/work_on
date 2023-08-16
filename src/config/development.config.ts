import path from "path";

import Config from "./config";

const config: Config = {
  env: "development",
  database: "mongodb://api:paSs!!2827@herdb-dev.hishk.com:27017/admin",
  adminFrontUrl: "https://heradmin-dev.hishk.com",
  imageFolder: path.join(
    __dirname,
    "..", // src
    "..", // root
    "media"
  ),
  paypal: {
    baseUrl: "https://api-m.sandbox.paypal.com",
    accessTokenUrl: "https://api.sandbox.paypal.com/v1/oauth2/token",
  },
  s3: {
    accessKeyId: "AKIAZ4AQFHEVZSLBKF42",
    accessKeySecret: "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",
    bucket: "her-dev",
    region: "ap-east-1",
  },
  smtp: {
    host: "mail.hisher.hk",
    port: 465,
    auth: {
      user: "hi@hisher.hk",
      pass: "vcmn;f?PH-MU",
    },
  },
  smtpFrom: '"HER Robot 👻" <hi@hisher.hk>"',
};

export default config;
