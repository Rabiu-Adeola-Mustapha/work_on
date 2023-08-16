import Debug from "debug";
import request from "supertest";

import app from "../app";
import AttributeModel, { AttributeDocLean } from "../models/attribute.model";
import ProductModel from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:26.productImportAdmin.test");

async function createAttribute(data: any) {
  const res = await request(app)
    .post("/admin/attribute/create")
    .set("x-access-token", testData.userJason.token)
    .set("shop-id", testData.shopAtilio.doc._id)
    .send(data);

  if (res.error) console.error(res.error);
  return res;
}

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

describe("Product Import Test", () => {
  before(async () => {});

  it("Import Products - Failed", async () => {
    const res = await request(app)
      .post("/admin/product/import")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        products: [
          {
            "attr.gold-weight": "35.449",
            "attr.size.en": "36'",
            "attr.size.zhHant": "36'",
            "attr.stone.en": "14D-1.279 (Rosecut)\n7 Pearl",
            "attr.stone.zhHant": "14D-1.279 (Rosecut)\n7 Pearl",
            "attr.style.en": "SI-UN-N003",
            "attr.style.zhHant": "SI-UN-N003",
            "category.1": "necklace",
            "category.2": "unity-of-love",
            "name.en": "18K Red Color Gold Pearl Diamond Necklace",
            "name.zhHant": "18K紅色黃金珍珠鑽石項鏈",
            price: 61800,
            sku: "N01841",
          },
        ],
      });

    if (res.error) console.log(res.error);
    res.status.should.equal(200);

    res.body[0].success.should.be.false;
    res.body[0].errors[0].should.equal('Unable to find category: "necklace"');
    res.body[0].errors[1].should.equal('Unable to find category: "unity-of-love"');
    res.body[0].errors[2].should.equal("Unable to find attribute: 'gold-weight'");
    res.body[0].errors[3].should.equal("Value from attr 'size' is not a numeric field");
    res.body[0].errors[4].should.equal("Unable to find attribute: 'stone'");
    res.body[0].errors[5].should.equal("Unable to find attribute: 'style'");
  });

  it("Insert Attributes and Categories", async () => {
    await createAttribute({
      code: "gold-weight",
      name: {
        en: "Gold Weight",
      },
      type: "number",
      unit: {
        en: "g",
      },
    });

    await createAttribute({
      code: "stone",
      name: {
        en: "Stone",
      },
      type: "string",
    });

    await createAttribute({
      code: "style",
      name: {
        en: "Style",
      },
      type: "string",
    });

    await AttributeModel.findOneAndRemove({
      shop_id: testData.shopAtilio.doc._id,
      code: "size",
    });

    await createAttribute({
      code: "size",
      name: {
        en: "Size",
      },
      type: "string",
    });

    await createCategory({
      code: "necklace",
      name: { en: "necklace" },
      slug: { en: "necklace" },
    });

    await createCategory({
      code: "unity-of-love",
      name: { en: "Unity of Love" },
      slug: { en: "unity-of-love" },
    });
  });

  it("Import Product - Success", async () => {
    const res = await request(app)
      .post("/admin/product/import")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        products: [
          {
            "attr.gold-weight": "35.449",
            "attr.size.en": "36'",
            "attr.size.zhHant": "36'",
            "attr.stone.en": "14D-1.279 (Rosecut)\n7 Pearl",
            "attr.stone.zhHant": "14D-1.279 (Rosecut)\n7 Pearl",
            "attr.style.en": "SI-UN-N003",
            "attr.style.zhHant": "SI-UN-N003",
            "category.1": "necklace",
            "category.2": "unity-of-love",
            "name.en": "18K Red Color Gold Pearl Diamond Necklace",
            "name.zhHant": "18K紅色黃金珍珠鑽石項鏈",
            price: 61800,
            sku: "N01841",
          },
        ],
      });

    if (res.error) console.log(res.error);
    res.status.should.equal(200);

    const product = await ProductModel.findOne({ sku: "N01841" }).populate(["attributes.attribute_id"]).lean();
    product.name.en.should.equal("18K Red Color Gold Pearl Diamond Necklace");
    (product.description === undefined).should.be.true;
    product.attributes.length.should.equal(4);
    const attribute = product.attributes.find((a) => (a.attribute_id as AttributeDocLean).code === "gold-weight");
    attribute.value.should.equal(35.449);
    product.category_ids.length.should.equal(2);
  });
});
