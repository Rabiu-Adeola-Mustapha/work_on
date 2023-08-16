import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:36.adminMailTemplate.test");

describe("MailTemplate Test", () => {
  let templateId: string;

  it("List Templates", async () => {
    const res = await request(app)
      .get(`/admin/mailTemplate/list`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(9);
    templateId = res.body[0].id;
  });

  it("Get Single MailTemplate", async () => {
    const res = await request(app) //
      .get(`/admin/mailTemplate/get?templateId=${templateId}`)
      .set("shop-id", testData.shopAtilio.doc._id)
      .set("x-access-token", testData.userJason.token);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
    res.body.id.should.equal(templateId);
  });

  //   TODO: update and test function tests
  //   it("Update Mail Template", async () => {
  //     const res = await request(app) //
  //       .post(`/admin/mailTemplate/update?templateId=${templateId}`)
  //       .set("shop-id", testData.shopAtilio.doc._id)
  //       .set("x-access-token", testData.userJason.token)
  //       .send({
  //         templateBody: "<h1>This is the body</h1>",
  //       });

  //     if (res.error) console.error(res.error);

  //     res.status.should.equal(200);
  //     res.body.body.should.equal("<h1>This is the body</h1>");
  //   });
});
