import path from "path";

import Config from "./config";

const config: Config = {
  env: "production",
  database: "mongodb://api:paSs!!2827@mongo:27017/admin",
  adminFrontUrl: "https://admin.hisher.hk",
  imageFolder: path.join(
    __dirname,
    "..", // src
    "..", // root
    "media"
  ),
  paypal: {
    baseUrl: "https://api.paypal.com",
    accessTokenUrl: "https://api.paypal.com/v1/oauth2/token",
  },
  s3: {
    accessKeyId: "AKIAZ4AQFHEV2GS2FAN7",
    accessKeySecret: "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",
    bucket: "her-prod",
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
