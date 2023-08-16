import nodemailer from "nodemailer";

import Config from "../utils/config";

async function setTestMailer() {
  const env = process.env.NODE_ENV || "development";

  if (env !== "test") return;

  const account = await nodemailer.createTestAccount();

  Config.smtp.auth = {
    user: account.user,
    pass: account.pass,
  };

  console.log("Setting TEST environment ethernal mail account: ", Config.smtp);
}

export default {
  setTestMailer,
};
