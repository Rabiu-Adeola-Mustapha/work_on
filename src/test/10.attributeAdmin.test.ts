import chai from "chai";
import Debug from "debug";
import request from "supertest";

import app from "../app";
import ProductModel from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:product.test");

chai.should();

async function createAttribute(data: any) {
  const res = await request(app)
    .post("/admin/attribute/create")
    .set("x-access-token", testData.userJason.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .send(data);

  if (res.error) console.error(res.error);
  return res;
}

async function getAttribute(id: string) {
  const res = await request(app)
    .get(`/admin/attribute/get?id=${testData.shopAtilio.colorAttributeId}`)
    .set("x-access-token", testData.userJason.token)
    .set("shop-id", testData.shopAtilio.doc._id);

  if (res.error) console.error(res.error);
  res.status.should.equal(200);

  return res;
}

describe("Attribute Test", () => {
  it("Add Attribute - String", async () => {
    const res = await createAttribute({
      code: "color",
      name: {
        en: "Color",
      },
      type: "string",
    });

    res.status.should.equal(200);

    (res.body.id !== undefined).should.be.true;
    res.body.name.en.should.equal("Color");

    testData.shopAtilio.colorAttributeId = res.body.id;
  });

  it("Get Attribute", async () => {
    const res = await getAttribute(testData.shopAtilio.colorAttributeId);

    res.body.id.should.equal(testData.shopAtilio.colorAttributeId);
  });

  it("Update Attribute", async () => {
    let res = await request(app)
      .post("/admin/attribute/update")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        id: testData.shopAtilio.colorAttributeId,
        code: "color",
        name: {
          en: "Colour",
        },
        type: "string",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res = await getAttribute(testData.shopAtilio.colorAttributeId);
    res.body.id.should.equal(testData.shopAtilio.colorAttributeId);
    res.body.name.en.should.equal("Colour");
  });

  it("Add Attribute - Number without unit", async () => {
    const res = await createAttribute({
      code: "size",
      name: {
        en: "Size",
      },
      type: "number",
    });

    res.status.should.equal(422);
  });

  it("Add Attribute - Number with unit", async () => {
    const res = await createAttribute({
      code: "size",
      name: {
        en: "Size",
      },
      type: "number",
      unit: {
        en: "cm",
      },
    });
    res.status.should.equal(200);
    res.body.unit.en.should.equal("cm");

    testData.shopAtilio.sizeAttributeId = res.body.id;
  });

  it("List Attributes", async () => {
    const res = await request(app)
      .get("/admin/attribute/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(2);
  });

  let masterProductId: string;

  it("Create Ring Product - Master", async () => {
    const res = await request(app)
      .post("/admin/product/create")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        type: "variationParent",
        name: {
          en: "Awesome Ring",
        },
        description: {
          en: "This ring has 2 colors!",
        },
        categoryIds: [testData.shopAtilio.cats.p1._id],
        galleryIds: [testData.shopAtilio.media1._id],
        featuredImgId: testData.shopAtilio.media1._id,
        descriptionGalleryIds: [testData.shopAtilio.media1._id],
        productType: "variationParent",
        sku: "awesome-ring",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.id !== undefined).should.be.true;
    masterProductId = res.body.id;
  });

  it("Create Product - Red Ring", async () => {
    const res = await request(app)
      .post("/admin/product/create")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        productType: "variationChild",
        parentId: masterProductId,
        sku: "RED-RING",
        price: 39.88,
        galleryIds: [testData.shopAtilio.media1._id],
        attributes: [{ attributeId: testData.shopAtilio.colorAttributeId, value: { en: "Red" } }],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Create Product - Silver Ring", async () => {
    const res = await request(app)
      .post("/admin/product/create")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        productType: "variationChild",
        parentId: masterProductId,
        sku: "SILVER-RING",
        price: 39.87,
        galleryIds: [testData.shopAtilio.media1._id],
        attributes: [{ attributeId: testData.shopAtilio.colorAttributeId, value: { en: "Silver" } }],
      });

    res.status.should.equal(200);
  });

  it("Get Master Product - Has 2 Variations", async () => {
    const res = await request(app) //
      .get(`/admin/product/get?productId=${masterProductId}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);

    (res.body.variations[0].id !== undefined).should.be.true;
    res.body.variations[0].sku.should.equal("RED-RING");
    res.body.variations[0].price.should.equal(39.88);
    res.body.variations[0].attributes[0].value.en.should.equal("Red");
    res.body.variations.length.should.equal(2);
  });

  it("List Products - No Child Variations", async () => {
    const res = await request(app) //
      .get("/admin/product/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);

    for (const child of res.body) {
      child.productType.should.not.equal("variationChild");
    }
  });

  it("Create Product - No Attribute Value", async () => {
    const res = await request(app) //
      .post("/admin/product/create")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        name: { en: "No Attribute" },
        sku: "noattribute",
        attributes: [
          {
            attributeId: testData.shopAtilio.colorAttributeId,
            value: "",
          },
        ],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    const product = await ProductModel.findOne({ "name.en": "No Attribute" }).lean();

    product.attributes.length.should.equal(0);
  });
});
