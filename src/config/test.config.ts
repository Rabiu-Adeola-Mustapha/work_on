import path from "path";

import Config from "./config";

const config: Config = {
  env: "test",
  database: "mongodb://127.0.0.1:27017/her-test",
  adminFrontUrl: "http://localhost:3002",
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
    bucket: "her-test",
    region: "ap-east-1",
  },
  smtp: {
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: "fidel.orn@ethereal.email",
      pass: "ejCD37Fz1FSprHyM9x",
    },
  },
  smtpFrom: '"HER Admin 👻" <admin@shoppick.com>"',
};

export default config;
