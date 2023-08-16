import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:product.test");

chai.should();

async function loginByGoogle() {
  const token = {
    iss: "https://accounts.google.com",
    nbf: 1669438515,
    aud: "250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com",
    sub: "100974656569704254141",
    email: "jasonching2005@gmail.com",
    email_verified: true,
    azp: "250173931767-kqf7h5gfkobrmg380uc4okmj8858oqdl.apps.googleusercontent.com",
    name: "Jason Ching",
    picture: "https://lh3.googleusercontent.com/a/ALm5wu3UJz-2OcGCqAdOyFogF1hV1m2HRT3rbt8kXMthew=s96-c",
    given_name: "Jason",
    family_name: "Ching",
    iat: 1669438815,
    exp: 1669442415,
    jti: "15f035ed792afa5d",
  };

  return await request(app) //
    .get("/public/user/profile")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("x-access-token", "googleTest:" + Buffer.from(JSON.stringify(token)).toString("base64"));
}

describe("Google Login", async () => {
  it("Get Profile - Account Created", async () => {
    const res = await loginByGoogle();

    if (res.error) console.error(res.error);

    res.status.should.equal(200);

    res.body.firstName.should.equal("Jason");
    res.body.lastName.should.equal("Ching");
    res.body.email.should.equal("jasonching2005@gmail.com");
    res.body.provider.should.equal("google");
  });

  it("Get Profile Again, No Duplicate Account", async () => {
    const res = await loginByGoogle();

    if (res.error) console.error(res.error);

    res.status.should.equal(200);
  });
});
