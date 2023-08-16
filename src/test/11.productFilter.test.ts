import Debug from "debug";
import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import counterCore from "../core/counter.core";
import ProductModel, { ProductDocLean, ProductPoJo } from "../models/product.model";
import { randomText } from "../utils/product.utils";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:productFilter.test");

async function resetProducts(products: Array<Partial<ProductPoJo>>) {
  await ProductModel.deleteMany({ shop_id: testData.shopAtilio.doc._id });

  for (const product of products) {
    const sequence = await counterCore.getNextSequence(testData.shopAtilio.doc._id, "product");

    await createProduct({
      sku: randomText(15),
      product_number: sequence,
      ...product,
    });
  }
}

async function createProduct(data: Partial<ProductDocLean>) {
  const product = {
    shop_id: testData.shopAtilio.doc._id,
    name: { en: "Product", zhHant: "Product", zhHans: "Product" },
    created_by: testData.userJason.doc._id,
    ...data,
  };

  // debug("createProduct", product);
  await ProductModel.create(product);
}

function partialWithCatId(...catIds: mongoose.Types.ObjectId[]): Partial<ProductPoJo> {
  return {
    category_ids: catIds,
  };
}

function partialWithPrice(price: number): Partial<ProductPoJo> {
  return {
    price,
  };
}

function partialWithPromotionProduct(isPromotionProduct: boolean): Partial<ProductPoJo> {
  return {
    is_promotion_product: isPromotionProduct,
  };
}

function partialWithAttributes(...attrs: Array<{ attributeId: string; value: any }>): Partial<ProductPoJo> {
  return {
    attributes: attrs.map((a) => {
      return {
        attribute_id: a.attributeId,
        value: a.value,
      } as any;
    }),
  };
}

async function listProduct(filter: any, locale = "en") {
  const res = await request(app) //
    .post("/public/product/list")
    .set("shop-id", testData.shopAtilio.doc._id)
    .set("locale", locale)
    .send(filter);

  if (res.error) console.error(res.error);

  res.status.should.equal(200);
  return res;
}

describe("Product Filter Test", () => {
  let originalProducts = undefined as ProductDocLean[];

  before(async () => {
    originalProducts = await ProductModel.find({ shop_id: testData.shopAtilio.doc._id }).lean();
  });

  it("Filter By Single Category", async () => {
    await resetProducts([
      partialWithCatId(testData.shopAtilio.cats.p1._id),
      partialWithCatId(testData.shopAtilio.cats.p1._id),
      partialWithCatId(testData.shopAtilio.cats.p2._id),
    ]);

    const res = await listProduct({
      cats: { type: "or", ids: [testData.shopAtilio.cats.p1._id.toString()] },
    });

    res.body.list.length.should.equal(2);
    res.body.list.length.should.equal(res.body.size);
  });

  it("Filter By Single Category - Slug", async () => {
    const res = await listProduct({
      cats: { type: "or", slugs: [testData.shopAtilio.cats.p1.slug.en] },
    });

    res.body.list.length.should.equal(2);
    res.body.list.length.should.equal(res.body.size);
  });

  it("Filter By Multiple Categories - OR", async () => {
    await resetProducts([
      partialWithCatId(testData.shopAtilio.cats.p1._id),
      partialWithCatId(testData.shopAtilio.cats.p1._id, testData.shopAtilio.cats.p2._id),
      partialWithCatId(testData.shopAtilio.cats.p2._id),
    ]);

    const res = await listProduct({
      cats: {
        type: "or",
        ids: [testData.shopAtilio.cats.p1._id.toString(), testData.shopAtilio.cats.p2._id.toString()],
      },
    });

    res.body.list.length.should.equal(3);
    res.body.list.length.should.equal(res.body.size);
  });

  it("Filter By Multiple Categories - OR - Slug", async () => {
    const res = await listProduct({
      cats: {
        type: "or",
        slugs: [testData.shopAtilio.cats.p1.slug.en, testData.shopAtilio.cats.p2.slug.en],
      },
    });

    res.body.list.length.should.equal(3);
    res.body.list.length.should.equal(res.body.size);
  });

  it("Filter By Multiple Categories - AND", async () => {
    await resetProducts([
      partialWithCatId(testData.shopAtilio.cats.p1._id),
      partialWithCatId(testData.shopAtilio.cats.p1._id, testData.shopAtilio.cats.p2._id),
      partialWithCatId(testData.shopAtilio.cats.p2._id),
    ]);

    const res = await listProduct({
      cats: {
        type: "and",
        ids: [testData.shopAtilio.cats.p1._id.toString(), testData.shopAtilio.cats.p2._id.toString()],
      },
    });

    res.body.list.length.should.equal(1);
    res.body.list.length.should.equal(res.body.size);
  });

  it("Filter by Category - Include Child", async () => {
    await resetProducts([
      partialWithCatId(testData.shopAtilio.cats.p1._id),
      partialWithCatId(testData.shopAtilio.cats.p1._id),
      // c1 is the child of p1
      partialWithCatId(testData.shopAtilio.cats.c1._id),
    ]);

    const res = await listProduct({
      cats: { type: "and", ids: [testData.shopAtilio.cats.p1._id.toString()] },
    });

    res.body.list.length.should.equal(3);
    res.body.list.length.should.equal(res.body.size);
  });

  it("Filter By Price Range", async () => {
    await resetProducts([
      partialWithPrice(100),
      partialWithPrice(100),
      partialWithPrice(100),
      partialWithPrice(200),
      partialWithPrice(200),
    ]);

    const res = await listProduct({
      price: {
        min: 100,
        max: 110,
      },
    });

    res.body.list.length.should.equal(3);
  });

  it("Filter By Feature Product", async () => {
    await resetProducts([
      partialWithPromotionProduct(true),
      partialWithPromotionProduct(true),
      partialWithPromotionProduct(true),
      partialWithPromotionProduct(false),
      partialWithPromotionProduct(false),
    ]);

    const res = await listProduct({ isPromotionProduct: true });
    res.body.list.length.should.equal(3);
  });

  it("Filter By Attributes - Setup", async () => {
    await resetProducts([
      partialWithAttributes(
        {
          attributeId: testData.shopAtilio.colorAttributeId,
          value: { en: "Red" },
        },
        {
          attributeId: testData.shopAtilio.sizeAttributeId,
          value: 15,
        }
      ),
      partialWithAttributes({
        attributeId: testData.shopAtilio.colorAttributeId,
        value: { en: "Red" },
      }),
      partialWithAttributes({
        attributeId: testData.shopAtilio.colorAttributeId,
        value: { en: "Green" },
      }),
    ]);
  });

  it("Filter By Attribute - Red", async () => {
    const res = await listProduct({
      attrs: {
        type: "or",
        list: [
          {
            attributeId: testData.shopAtilio.colorAttributeId,
            value: "Red",
          },
        ],
      },
    });

    res.body.list.length.should.equal(2);
  });

  it("Filter By Attribute - Green and 15", async () => {
    const res = await listProduct({
      attrs: {
        type: "or",
        list: [
          {
            attributeId: testData.shopAtilio.colorAttributeId,
            value: "Red",
          },
          {
            attributeId: testData.shopAtilio.sizeAttributeId,
            value: 10,
          },
        ],
      },
    });

    res.body.list.length.should.equal(2);
  });

  it("Filter By Attribute - Green and Greater Than 15", async () => {
    const res = await listProduct({
      attrs: {
        type: "or",
        list: [
          {
            attributeId: testData.shopAtilio.colorAttributeId,
            value: "Red",
          },
          {
            attributeId: testData.shopAtilio.sizeAttributeId,
            value: { $gte: 15 },
          },
        ],
      },
    });

    res.body.list.length.should.equal(2);
  });

  it("Filter By Attribute - Less than 15", async () => {
    const res = await listProduct({
      attrs: {
        type: "or",
        list: [
          {
            attributeId: testData.shopAtilio.sizeAttributeId,
            value: { $lt: 15 },
          },
        ],
      },
    });

    res.body.list.length.should.equal(0);
  });

  it("Filter By Attribute - Red and Green", async () => {
    const res = await listProduct({
      attrs: {
        type: "and",
        list: [
          {
            attributeId: testData.shopAtilio.colorAttributeId,
            value: "Red",
          },
          {
            attributeId: testData.shopAtilio.colorAttributeId,
            value: "Red",
          },
        ],
      },
    });

    res.body.list.length.should.equal(2);
  });

  describe("Filter By Search", () => {
    before(async () => {
      await resetProducts([
        {
          name: {
            en: "Health King - Joint Care Ultra",
            zhHant: "健康尚品 - 特強關節專方-關節痛僵硬退化腳痛頸痛背痛軟骨再生葡萄糖胺薑黃素軟骨素治標治本斷尾炎痛消",
          },
          description: {
            en: "Offers fast relief for chronic pain without side effects of NSAIDs\nPrevent deterioration of joint cartilage\nHelps restore flexibility and joint integrity\nDevelop and maintain bones",
            zhHant:
              "*滋養及潤滑關節、促進軟骨組織再生。\n*修補受損軟骨,改善腰背肩坐骨等不適。\n*減輕關節疼痛、僵硬、腫脹、灼熱。\n*舒緩肌肉酸痛、緊繃、疲勞、痠軟無力。\n*強化筋腱、韌帶,加強活動時關節的保護。\n*提升關節活動能力、保持關節靈活輕鬆 。\n*抑制自由基對關節的傷害,降低患慢性痛的風險。\n*鞏固關節、維持頭髮、指甲的彈性及光澤。\n此日期前最佳(日/月/年):31. 12. 2024",
          },
        },
        {
          name: {
            en: "Mustela - 【增量裝】髮膚沐浴啫喱750ml 增量裝 【香港原裝行貨】 (5839)",
            zhHant: "Mustela - 【Vol Up】 Gentle Cleansing Gel for Hair & Body 750ml (5839)",
          },
          description: {
            en: "【增量裝】髮膚沐浴啫喱750ml 增量裝 【香港原裝行貨】",
            zhHant: "【Vol Up】 Gentle Cleansing Gel for Hair & Body 750ml",
          },
        },
      ] as any);
    });

    it("English", async () => {
      const res = await listProduct({
        search: "health king",
      });

      res.body.list.length.should.equal(1);
    });

    it("Chinese", async () => {
      const res = await listProduct({ search: "促進軟骨組織再生" });
      res.body.list.length.should.equal(1);
    });
  });

  describe("Filter By Search with Partial Words", async () => {
    before(async () => {
      await resetProducts([
        {
          name: {
            en: "CE285A(85A) Original Black Toner",
            zhHant: "CE285A(85A) 原裝黑色碳粉",
          },
        },
        {
          name: {
            en: "CE28?5A(85A) Original Black Toner",
            zhHant: "CE28?5A(85A) 原裝黑色碳粉",
          },
        },
      ] as any);
    });

    it("Search '285'", async () => {
      const res = await listProduct({
        search: "285",
      });

      res.body.list.length.should.equal(1);
    });

    it("Search '28?', special character", async () => {
      const res = await listProduct({
        search: "28?",
      });

      res.body.list.length.should.equal(1);
    });

    after(async () => {
      await ProductModel.deleteMany({ shop_id: testData.shopAtilio.doc._id });
      await ProductModel.create(originalProducts);
    });
  });

  after(async () => {
    await ProductModel.deleteMany({ shop_id: testData.shopAtilio.doc._id });
    await ProductModel.create(originalProducts);
  });
});
