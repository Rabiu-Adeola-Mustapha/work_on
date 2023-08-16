import Debug from "debug";
import request from "supertest";

import app from "../app";
import counterCore from "../core/counter.core";
import { LocaleTextPoJo } from "../models/locale.model";
import ProductModel, { ProductDocLean, ProductPoJo } from "../models/product.model";
import { randomText } from "../utils/product.utils";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:24.attributeFront.test");

async function resetProducts(products: Array<Partial<ProductPoJo>>) {
  await ProductModel.deleteMany({ shop_id: testData.shopAtilio.doc._id });

  for (const product of products) {
    await createProduct(product);
  }
}

async function createProduct(data: Partial<ProductDocLean>) {
  const sequence = await counterCore.getNextSequence(testData.shopAtilio.doc._id, "product");

  const product = {
    sku: randomText(15),
    product_number: sequence,
    shop_id: testData.shopAtilio.doc._id,
    name: { en: "Product", zhHant: "Product", zhHans: "Product" },
    created_by: testData.userJason.doc._id,
    ...data,
  };

  // debug("createProduct", product);
  await ProductModel.create(product);
}

function partialAttribute(attrs: Array<{ id: string; value: LocaleTextPoJo | number }>): Partial<ProductDocLean> {
  return {
    attributes: attrs.map(({ id, value }) => {
      return {
        attribute_id: id as any,
        value,
      } as any;
    }),
  };
}

describe("Attribute Front Test", () => {
  let originalProducts = undefined as ProductDocLean[];

  before(async () => {
    originalProducts = await ProductModel.find({ shop_id: testData.shopAtilio.doc._id }).lean();

    await resetProducts([
      partialAttribute([
        { id: testData.shopAtilio.colorAttributeId, value: { en: "Red", zhHant: "紅色", zhHans: "紅色" } },
        { id: testData.shopAtilio.colorAttributeId, value: { en: "White", zhHant: "白色", zhHans: "白色" } },
        { id: testData.shopAtilio.colorAttributeId, value: { en: "Silver", zhHant: "銀色", zhHans: "銀色" } },
        { id: testData.shopAtilio.colorAttributeId, value: { en: "Silver", zhHant: "銀色", zhHans: "銀色" } },
        { id: testData.shopAtilio.colorAttributeId, value: { en: "Green", zhHant: "綠色", zhHans: "綠色" } },
        { id: testData.shopAtilio.colorAttributeId, value: { en: "Green", zhHant: "綠色", zhHans: "綠色" } },
        { id: testData.shopAtilio.colorAttributeId, value: { en: "Green", zhHant: "綠色", zhHans: "綠色" } },
        { id: testData.shopAtilio.sizeAttributeId, value: 10 },
        { id: testData.shopAtilio.sizeAttributeId, value: 10 },
        { id: testData.shopAtilio.sizeAttributeId, value: 11 },
        { id: testData.shopAtilio.sizeAttributeId, value: 11 },
        { id: testData.shopAtilio.sizeAttributeId, value: 12 },
      ]),
    ]);
  });

  it("Get Distinct Attributes", async () => {
    const res = await request(app) //
      .get("/public/attribute/list")
      .set("shop-id", testData.shopAtilio.doc._id);

    if (!res.error) console.error(res.error);
    res.status.should.equal(200);

    res.body.length.should.equal(2);
    res.body[0].name.should.equal("Colour");
    res.body[0].values.length.should.equal(4);

    res.body[1].name.should.equal("Size");
    res.body[1].values.length.should.equal(3);
  });

  after(async () => {
    await ProductModel.deleteMany({ shop_id: testData.shopAtilio.doc._id });
    await ProductModel.create(originalProducts);
  });
});
