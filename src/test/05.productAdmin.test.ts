import Debug from "debug";
import request from "supertest";

import app from "../app";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:productAdmin.test");

describe("Product Admin Test", async () => {
  let productId = "";

  it("Create Product", async () => {
    const res = await request(app) //
      .post("/admin/product/create")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        price: "102.5",
        name: {
          en: "GIORDANO Clothes",
          zhHant: "GIORDANO BM 女裝三條裝彈力棉純色三角內褲",
          zhHans: "",
        },
        description: {
          en: "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料,質感細膩,富有彈性,持久耐穿;鬆緊腰頭,貼合腰部,穿著自在不勒身;襠位加厚,柔軟舒適;雙線修邊,接縫平滑,彰顯品牌品質.\n\n此款式的參考腰圍是以拉度尺寸量度",
          zhHant:
            "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料,質感細膩,富有彈性,持久耐穿;鬆緊腰頭,貼合腰部,穿著自在不勒身;襠位加厚,柔軟舒適;雙線修邊,接縫平滑,彰顯品牌品質.\n\n此款式的參考腰圍是以拉度尺寸量度",
          zhHans: "",
        },
        shortDescription: {
          en: "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料",
          zhHant: "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料",
          zhHans: "",
        },
        sku: "SKU-123",
        isPromotionProduct: true,
        categoryIds: [testData.shopAtilio.cats.p1._id],
        galleryIds: [testData.shopAtilio.media1._id],
        featuredImgId: testData.shopAtilio.media1._id,
        descriptionGalleryIds: [testData.shopAtilio.media1._id],
        availability: "out",
        stockReadyDate: "2023-05-01",
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);
  });

  it("Get Product List", async () => {
    const res = await request(app) //
      .get("/admin/product/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);

    res.body.length.should.equal(1);
    res.body[0].galleries[0].id.should.equal(testData.shopAtilio.media1._id.toString());
    res.body[0].descriptionGalleries.length.should.equal(1);
    res.body[0].sku.should.equal("SKU-123");
    res.body[0].isPromotionProduct.should.equal(true);
    res.body[0].availability.should.equal("out");
    res.body[0].stockReadyDate.should.equal("2023-05-01");

    productId = res.body[0].id;
  });

  it("Get Single Product", async () => {
    const res = await request(app) //
      .get(`/admin/product/get?productId=${productId}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);

    res.body.galleries[0].id.should.equal(testData.shopAtilio.media1._id.toString());
    res.body.descriptionGalleries.length.should.equal(1);
    (res.body.galleries[0].url !== undefined).should.be.true;
  });

  it("Update Product - Remove Gallery", async () => {
    let res = await request(app) //
      .post("/admin/product/update")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        productId,
        price: "102.5",
        name: {
          en: "GIORDANO Clothes",
          zhHant: "GIORDANO BM 女裝三條裝彈力棉純色三角內褲",
          zhHans: "",
        },
        description: {
          en: "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料,質感細膩,富有彈性,持久耐穿;鬆緊腰頭,貼合腰部,穿著自在不勒身;襠位加厚,柔軟舒適;雙線修邊,接縫平滑,彰顯品牌品質.\n\n此款式的參考腰圍是以拉度尺寸量度",
          zhHant:
            "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料,質感細膩,富有彈性,持久耐穿;鬆緊腰頭,貼合腰部,穿著自在不勒身;襠位加厚,柔軟舒適;雙線修邊,接縫平滑,彰顯品牌品質.\n\n此款式的參考腰圍是以拉度尺寸量度",
          zhHans: "",
        },
        categoryIds: [testData.shopAtilio.cats.p1._id],
        featuredImgId: testData.shopAtilio.media1._id,
        descriptionGalleryIds: [testData.shopAtilio.media1._id],
      });

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    res = await request(app) //
      .get(`/admin/product/get?productId=${productId}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.body.galleries.length.should.equal(0);
  });

  it("Update - Remove stockReadyDate", async () => {
    it("Update Product - Remove Gallery", async () => {
      let res = await request(app) //
        .post("/admin/product/update")
        .set("x-access-token", testData.userJason.token)
        .set("shop-id", testData.shopAtilio.doc._id)
        .send({
          productId,
          price: "102.5",
          name: {
            en: "GIORDANO Clothes",
            zhHant: "GIORDANO BM 女裝三條裝彈力棉純色三角內褲",
            zhHans: "",
          },
          description: {
            en: "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料,質感細膩,富有彈性,持久耐穿;鬆緊腰頭,貼合腰部,穿著自在不勒身;襠位加厚,柔軟舒適;雙線修邊,接縫平滑,彰顯品牌品質.\n\n此款式的參考腰圍是以拉度尺寸量度",
            zhHant:
              "顏色:(Tapioca+Purple+Blue)\n褲身棉與氨綸混紡面料,質感細膩,富有彈性,持久耐穿;鬆緊腰頭,貼合腰部,穿著自在不勒身;襠位加厚,柔軟舒適;雙線修邊,接縫平滑,彰顯品牌品質.\n\n此款式的參考腰圍是以拉度尺寸量度",
            zhHans: "",
          },
          categoryIds: [testData.shopAtilio.cats.p1._id],
          featuredImgId: testData.shopAtilio.media1._id,
          descriptionGalleryIds: [testData.shopAtilio.media1._id],
          availability: "in",
          stockReadyDate: "",
        });

      if (res.error) console.error(res.error);
      res.status.should.equal(200);

      res = await request(app) //
        .get(`/admin/product/get?productId=${productId}`)
        .set("x-access-token", testData.userJason.token)
        .set("shop-id", testData.shopAtilio.doc._id);

      res.body.availability.should.equal("in");
      res.body.stockReadyDate.should.equal("");
    });
  });
});
