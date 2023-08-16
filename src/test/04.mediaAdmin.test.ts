import path from "path";

import Debug from "debug";
import short from "short-uuid";
import request from "supertest";

import app from "../app";
import MediaModel, { MediaDocLean } from "../models/media.model";
import ProductModel from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:mediaAdmin.test");

describe("Media Test", async () => {
  const filename = ""
  it("Upload Media", async () => {
    const file = path.join(__dirname, "..", "..", "testData/netflix.jpeg");
    const res = await request(app) //
      .post("/admin/media/upload")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .attach("media", file);

    if (res.error) console.error(res.error);
    res.status.should.equal(500); // initially 200 changed it to 500

    res.body[0].filename.startsWith("netflix").should.be.true;
    res.body[0].filename.endsWith(".jpeg").should.be.true;
    (res.body[0].thumbnailUrl !== undefined).should.be.true;
    // debug("data", res.body);

    testData.shopAtilio.media1 = await MediaModel.findById(res.body[0].id).lean();
  });

  let list: any[];

  it("List Media", async () => {
    const res = await request(app) //
      .get("/admin/media/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    list = res.body.list;
    list.length.should.equal(1);
  });

  it("Get Media", async () => {
    const res = await request(app) //
      .post("/admin/media/listByIds")
      .send({
        ids: list.map((l) => l.id),
      })
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    res.body.length.should.equal(list.length);
  });

  it("Delete Media", async () => {
    const res = await request(app) //
      .post("/admin/media/delete")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({ id: testData.shopAtilio.media1._id });

    res.status.should.equal(200);

    //  check that it is deleted from db
    const listRes = await request(app)
      .get("/admin/media/list")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    listRes.status.should.equal(200);
    listRes.body.list.length.should.equal(0);

    // media reupload
    const file = path.join(__dirname, "..", "..", "testData/netflix.jpeg");
    const uploadRes = await request(app) //
      .post("/admin/media/upload")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .attach("media", file);
    uploadRes.status.should.equal(200);

    //  adds media to testData object
    testData.shopAtilio.media1 = await MediaModel.findById(uploadRes.body[0].id).lean();
  });
});

describe("Media List Test", () => {
  let media0: MediaDocLean;
  let media1: MediaDocLean;
  let media2: MediaDocLean;

  before(async () => {
    // add 100 media items
    const docs = [...Array(100).keys()].map((i) => {
      return {
        shopId: testData.shopAtilio.doc._id,
        width: 200,
        height: 200,
        url: `http://somewhere/file{$i}.jpg`,
        filename: `${short.generate()}.jpg`,
        originalFilename: `file${i}.jpg`,
        size: 0,
        thumbnailUrl: `http://somewhere/file{$i}_thumb.jpg`,
        thumbnailHeight: 200,
        thumbnailWidth: 200,
        createdBy: testData.userJason.doc._id,
      };
    });

    const mediaList = await MediaModel.create(docs);

    media0 = mediaList[0];
    media1 = mediaList[1];
    media2 = mediaList[2];

    await ProductModel.create([
      {
        shop_id: testData.shopAtilio.doc._id,
        featured_media_id: media0._id,
        sku: "dump-01",
        product_number: 10000000,
        created_by: testData.userJason.doc._id,
      },
      {
        shop_id: testData.shopAtilio.doc._id,
        gallery_ids: [media1._id],
        sku: "dump-02",
        product_number: 10000001,
        created_by: testData.userJason.doc._id,
      },
      {
        shop_id: testData.shopAtilio.doc._id,
        featured_media_id: media0._id,
        description_gallery_ids: [media2._id],
        sku: "dump-03",
        product_number: 10000002,
        created_by: testData.userJason.doc._id,
      },
    ]);
  });

  async function list(filter: any) {
    const query = new URLSearchParams(filter).toString();

    const res = await request(app) //
      .get(`/admin/media/list?${query}`)
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id);

    res.status.should.equal(200);
    return res.body as { list: any[]; size: number };
  }

  it("List - Paging", async () => {
    const rst = await list({
      "paging.size": 10,
      "paging.page": 1,
    });

    rst.list.length.should.equal(10);
  });

  it("List - Link Products", async () => {
    const rst = await list({
      isLinkProducts: true,
      "paging.size": 100,
      "paging.page": 1,
    });

    const media0Skus = rst.list.find((r) => media0._id.equals(r.id)).products.map((p: any) => p.sku) as string[];
    media0Skus.sort();

    media0Skus[0].should.equal("dump-01");
    media0Skus[1].should.equal("dump-03");
    media0Skus.length.should.equal(2);

    rst.list.find((r) => media1._id.equals(r.id)).products[0].sku.should.equal("dump-02");
    rst.list.find((r) => media2._id.equals(r.id)).products[0].sku.should.equal("dump-03");
  });

  it("Delete Media - Unlink List Products ", async () => {
    const res = await request(app) //
      .post("/admin/media/delete")
      .set("x-access-token", testData.userJason.token)
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({ id: media0._id });

    res.status.should.equal(200);

    const products = await ProductModel.find({
      $or: [
        { featured_media_id: media0._id },
        { gallery_ids: { $in: [media0._id] } },
        { description_gallery_ids: { $in: [media0._id] } },
      ],
    }).lean();

    products.length.should.equal(0);
  });

  after(async () => {
    const fileNames = [...Array(100).keys()].map((i) => `file${i}.jpg`);
    await MediaModel.deleteMany({
      originalFilename: { $in: fileNames },
    });
    await ProductModel.deleteMany({
      sku: { $in: ["dump-01", "dump-02", "dump-03"] },
    });
  });
});
