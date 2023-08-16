import Debug from "debug";
import express from "express";
import { TokenPayload } from "google-auth-library";

import UserModel, { AuthProvider, UserDocLean } from "../models/user.model";
import frontUserUtil, { DecodedToken, FacebookTokenPayload, LocalTokenPayload } from "../utils/frontUser.utils";

// eslint-disable-next-line
const debug = Debug("project:frontAuth");

export default async function frontAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers["x-access-token"] as string;

  if (token === undefined) {
    res.status(401).json({ message: "missingToken" });
    return;
  }

  try {
    const decoded = await frontUserUtil.decodeToken(token, req.shop);

    const user = await getUser(req.shop._id, decoded);
    if (!user) {
      res.status(401).json({ message: "invalidUser" });
      return;
    }

    req.frontUser = { _id: user._id };
    next();
  } catch (e) {
    console.error(e);
    res.status(401).json({ message: "invalidToken" });
  }
}

async function getUser(shopId: string, decoded: DecodedToken) {
  switch (decoded.provider) {
    case "local":
      return await UserModel.findById((decoded.payload as LocalTokenPayload).userId, ["_id"]).lean();
    case "google":
      return await getUserFromGoogleToken(shopId, decoded.payload as TokenPayload);
    case "facebook":
      return await getUserFromFacebooktoken(shopId, decoded.payload as FacebookTokenPayload);
    default:
      return undefined;
  }
}

async function getUserFromGoogleToken(shopId: string, payload: TokenPayload): Promise<UserDocLean> {
  const foundUser = await getUserFromExternal(AuthProvider.google, shopId, payload.sub);

  if (foundUser) {
    return foundUser;
  }

  return await UserModel.create({
    shop_id: shopId,
    first_name: payload.given_name,
    last_name: payload.family_name,
    email: payload.email,
    email_verified: payload.email_verified,
    picture_url: payload.picture,
    provider: AuthProvider.google,
    provider_id: payload.sub,
  });
}

async function getUserFromFacebooktoken(shopId: string, payload: FacebookTokenPayload): Promise<UserDocLean> {
  console.log("facebook payload", payload);
  const foundUser = await getUserFromExternal(AuthProvider.facebook, shopId, payload.id);

  if (foundUser) {
    return foundUser;
  }

  return await UserModel.create({
    shop_id: shopId,
    first_name: payload.first_name,
    last_name: payload.last_name,
    provider: AuthProvider.facebook,
    provider_id: payload.id,
    email_verified: true,
    email: payload.email,
  });
}

async function getUserFromExternal(provider: AuthProvider, shopId: string, providerId: string) {
  return await UserModel.findOne(
    {
      shop_id: shopId,
      provider: provider.toString(),
      provider_id: providerId,
    },
    ["_id"]
  ).lean();
}
