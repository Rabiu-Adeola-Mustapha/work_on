import axios from "axios";
import Debug from "debug";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import jwt from "jsonwebtoken";

import { ShopRequestType } from "../models/shop.model";

// eslint-disable-next-line
const debug = Debug("project:frontUser.util");

export interface LocalTokenPayload {
  userId: string;
  internalPassword: string;
}

export interface DecodedToken {
  provider: string;
  payload: LocalTokenPayload | TokenPayload | FacebookTokenPayload;
}

export interface FacebookTokenPayload {
  first_name: string;
  last_name: string;
  id: string;
  email: string;
}

async function decodeToken(token: string, shop: ShopRequestType): Promise<DecodedToken> {
  const [provider, leftToken] = token.split(":");

  switch (provider) {
    case "local":
      return {
        provider: "local",
        payload: await decodeTokenLocal(leftToken),
      };
    case "googleTest":
      if (process.env.NODE_ENV === "test") {
        const payload = JSON.parse(Buffer.from(leftToken, "base64").toString("ascii"));

        return {
          provider: "google",
          payload,
        };
      }
      return undefined;
    case "google":
      return {
        provider: "google",
        payload: await decodeTokenGoogle(leftToken, shop),
      };
    case "facebook":
      return {
        provider: "facebook",
        payload: await decodeTokenFacebook(leftToken),
      };
    default:
      return undefined;
  }
}

function decodeTokenLocal(token: string) {
  return new Promise<LocalTokenPayload>((resolve, reject) => {
    jwt.verify(token, "mysecret.@#KSJ1a@js", (error, decoded) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(decoded as LocalTokenPayload);
    });
  });
}

async function decodeTokenGoogle(token: string, shop: ShopRequestType): Promise<TokenPayload> {
  const secretKey = shop.google_key_secret;
  const clientId = shop.google_key_client_id;

  const client = new OAuth2Client(clientId, secretKey);

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: clientId, // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();

  return payload;
}

async function decodeTokenFacebook(token: string): Promise<FacebookTokenPayload> {
  const res = await axios.get<FacebookTokenPayload>(
    `https://graph.facebook.com/me?access_token=${token}&fields=id,email,first_name,last_name`
  );
  return res.data;
}

export default { decodeToken };
