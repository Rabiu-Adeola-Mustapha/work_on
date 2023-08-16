import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:37.bannerAdmin.test");

async function list(groupName: string) {
  const res = await request(app)
    .get(`/admin/banner/list?groupName=${groupName}`) //
    .set("x-access-token", testData.userJason.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
  return res.body;
}

async function create(data: any) {
  const res = await request(app)
    .post("/admin/banner/create") //
    .set("x-access-token", testData.userJason.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .send(data);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);
}

describe("Banner Admin Test", () => {
  let mediaList: any[];
  let bannerList: any[];

  it("Get Meida List", async () => {
    const res = await request(app) //
      .get("/admin/media/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    mediaList = res.body.list;
  });

  it("Create Banner", async () => {
    await create({
      mediaId: mediaList[0].id,
      url: "http://localhost:3001/1",
      groupName: "header",
    });
  });

  it("Create 2nd Banner", async () => {
    await create({
      mediaId: mediaList[1].id,
      url: "http://localhost:3001/2",
      groupName: "header",
    });
  });

  it("Get Banner List", async () => {
    bannerList = await list("header");

    bannerList.length.should.equal(2);

    bannerList[0].mediaUrl.should.equal(mediaList[0].url);
    bannerList[0].href.should.equal("http://localhost:3001/1");
    bannerList[0].order.should.equal(0);

    bannerList[1].mediaUrl.should.equal(mediaList[1].url);
    bannerList[1].href.should.equal("http://localhost:3001/2");
    bannerList[1].order.should.equal(2);
  });

  it("Reorder Banner", async () => {
    const res = await request(app)
      .post("/admin/banner/reOrder") //
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        order: [bannerList[1].id, bannerList[0].id],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Verify Reorder", async () => {
    bannerList = await list("header");

    bannerList.length.should.equal(1);
    bannerList[0].imgUrl.should.equal(bannerList[1].url);
    bannerList[0].order.should.equal(0);

    bannerList[1].imgUrl.should.equal(bannerList[0].url);
    bannerList[1].order.should.equal(1);
  });

  it("Remove Banner", async () => {
    const res = await request(app)
      .post("/admin/banner/delete") //
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        bannerId: bannerList[0].id,
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Verify Removed", async () => {
    bannerList = await list("header");

    bannerList.length.should.equal(1);
    bannerList[0].imgUrl.should.equal(bannerList[1].url);
  });
});
