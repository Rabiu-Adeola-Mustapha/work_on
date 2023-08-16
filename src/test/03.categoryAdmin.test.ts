import Debug from "debug";
import request from "supertest";

import app from "../app";
import CategoryModel from "../models/category.model";
import testData from "./testData";

const debug = Debug("project:categoryAdmin.test");

async function createCategory(data: any) {
  const res = await request(app)
    .post("/admin/category/create")
    .set("x-access-token", testData.userJason.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .send(data);

  if (res.error) console.error(res.error);

  res.status.should.equal(200);
  return res.body;
}

describe("Category Admin Test", async () => {
  let p1Cat: any;
  let p2Cat: any;

  it("Add Category - 1", async () => {
    p1Cat = await createCategory({
      code: "p1",
      name: { en: "P1" },
      slug: { en: "p1" },
    });

    (p1Cat.id !== undefined).should.be.true;
    p1Cat.name.en.should.equal("P1");
    p1Cat.slug.en.should.equal("p1");

    testData.shopAtilio.cats.p1 = await CategoryModel.findById(p1Cat.id).lean();
  });

  it("Add Category - 2", async () => {
    const c1Cat = await createCategory({ code: "c1", name: { en: "C1" }, slug: { en: "c1" }, parentId: p1Cat.id });
    testData.shopAtilio.cats.c1 = await CategoryModel.findById(c1Cat.id).lean();
  });

  it("Add Category - 3", async () => {
    p2Cat = await createCategory({ code: "p2", name: { en: "P2" }, slug: { en: "p2" } });
    testData.shopAtilio.cats.p2 = await CategoryModel.findById(p2Cat.id).lean();
  });

  it("List Category", async () => {
    const res = await request(app)
      .get("/admin/category/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    res.body.length.should.equal(3);

    res.body[0].name.en.should.equal("P1");
    (res.body[0].id !== undefined).should.be.true;
    res.body[0].slug.en.should.equal("p1");

    res.body[1].parentId.should.equal(p1Cat.id);
  });

  it("Edit Category", async () => {
    const res = await request(app)
      .post("/admin/category/edit")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        id: p1Cat.id,
        name: { en: "P1 New" },
        slug: { en: "p1" },
      });

    res.status.should.equal(200);
  });

  it("Edit Category to P2 to Parent P1", async () => {
    const res = await request(app)
      .post("/admin/category/edit")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        id: p2Cat.id,
        name: { en: "P2 New" },
        slug: { en: "p2" },
        parentId: p1Cat.id,
      });

    res.status.should.equal(200);
  });

  it("Get Single Cat - P1", async () => {
    const id = p1Cat.id as string;

    const res = await request(app)
      .get(`/admin/category/get?id=${id}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) debug("error", res.error);

    res.status.should.equal(200);
    res.body.name.en.should.equal("P1 New");
  });

  it("Get Single Cat - P1", async () => {
    const id = p2Cat.id as string;

    const res = await request(app)
      .get(`/admin/category/get?id=${id}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) debug("error", res.error);

    res.status.should.equal(200);
    res.body.parentId.should.equal(p1Cat.id);
  });

  it("Remove P2's parent", async () => {
    let res = await request(app)
      .post("/admin/category/edit")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        id: p2Cat.id,
        name: { en: "P2" },
        slug: { en: "p2" },
      });

    res.status.should.equal(200);

    res = await request(app)
      .get(`/admin/category/get?id=${p2Cat.id as string}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    debug("category", res.body);
    (res.body.parentId === null).should.be.true;
  });
});
