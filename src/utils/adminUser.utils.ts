import bcrypt from "bcrypt";
import { addMinutes, isAfter } from "date-fns";
import Debug from "debug";
import jwt from "jsonwebtoken";

import { AdminUserDocLean } from "../models/adminUser.model";
import { UserDocLean } from "../models/user.model";

// eslint-disable-next-line
const debug = Debug("project:adminUser.utils");

async function generateHash(plain: string): Promise<string> {
  return await bcrypt.hash(plain, 8);
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plain, hash);
}

function randomInternalPassword() {
  return Math.random().toString(36).substring(2);
}

function generateToken(user: AdminUserDocLean): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(
      {
        userId: user._id,
        internalPassword: user.internal_password,
      },
      "mysecret.@#KSJ1a@js",
      {
        // in seconds
        expiresIn: "3d",
      },
      (error, encoded) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(encoded);
      }
    );
  });
}

function generateTokenFront(user: UserDocLean): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(
      {
        userId: user._id,
        internalPassword: user.internal_password,
      },
      "mysecret.@#KSJ1a@js",
      {
        // in seconds
        expiresIn: "3d",
      },
      (error, encoded) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(encoded);
      }
    );
  });
}

function decodeToken(token: string) {
  return new Promise<{ userId: string; internalPassword: string }>((resolve, reject) => {
    jwt.verify(token, "mysecret.@#KSJ1a@js", (error, decoded) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(decoded as any);
    });
  });
}

function generateSmsOtp(digits = 6) {
  let rst = "";

  for (let i = 0; i < digits; i++) {
    rst = rst + Math.floor(Math.random() * 10).toString();
  }

  return rst;
}

function verifySmsOtp(user: UserDocLean, otp: string) {
  const createdAtPlusOne = addMinutes(new Date(user.sms_otp_created_at), 1);

  if (isAfter(new Date(), createdAtPlusOne)) {
    return {
      rst: false,
      message: "expired",
    };
  }

  if (user.sms_otp !== otp) {
    return {
      rst: false,
      message: "mismatched",
    };
  }

  return { rst: true };
}

function verifySmsOtpUpdating(user: UserDocLean, otp: string) {
  const createdAtPlusOne = addMinutes(new Date(user.updating_sms_otp_created_at), 1);

  if (isAfter(new Date(), createdAtPlusOne)) {
    return {
      rst: false,
      message: "expired",
    };
  }

  if (user.updating_sms_otp !== otp) {
    return {
      rst: false,
      message: "mismatched",
    };
  }

  return { rst: true };
}

export default {
  generateHash,
  verifyPassword,
  randomInternalPassword,
  generateToken,
  generateTokenFront,
  decodeToken,
  generateSmsOtp,
  verifySmsOtp,
  verifySmsOtpUpdating,
};
