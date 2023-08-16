import Debug from "debug";
import request from "supertest";

import app from "../app";
import ProductModel, { ProductDocLean } from "../models/product.model";
import testData from "./testData";

// eslint-disable-next-line
const debug = Debug("project:cart.test");

async function addToCart(cartId: string, product: ProductDocLean) {
  return await request(app)
    .post("/public/cart/addProduct") //
    .set("shop-id", testData.shopAtilio.doc._id)
    .send({
      cartId,
      productId: product._id,
      quantity: 1,
    });
}

async function getCart(cartId: string) {
  return await request(app) //
    .get(`/public/cart/get?cartId=${cartId}`)
    .set("shop-id", testData.shopAtilio.doc._id);
}

describe("Cart Test", async () => {
  let cartId: string;
  let addingProduct: ProductDocLean;

  it("Get Cart ID", async () => {
    const res = await request(app) //
      .get("/public/cart/getId")
      .set("shop-id", testData.shopAtilio.doc._id);

    if (res.error) console.error(res.error);
    res.status.should.equal(200);

    (res.body.cartId !== undefined).should.be.true;
    cartId = res.body.cartId;
  });

  it("Add To Cart", async () => {
    const product = await ProductModel.findOne().lean();

    addingProduct = product;
    const res = await addToCart(cartId, product);
    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
  });

  it("Get Cart Items", async () => {
    const res = await getCart(cartId);

    res.status.should.equal(200);

    res.body.items.length.should.equal(1);
    res.body.items[0].itemPrice.should.equal(102.5);
    res.body.items[0].quantity.should.equal(1);
    res.body.items[0].product.id.should.equal(addingProduct._id.toString());
    res.body.items[0].product.name.should.equal(addingProduct.name.en);
    (res.body.items[0].product.featureMedia.url !== undefined).should.be.true;
  });

  it("Get Cart Count", async () => {
    const res = await request(app) //
      .get(`/public/cart/getCount?cartId=${cartId}`)
      .set("shop-id", testData.shopAtilio.doc._id);
    res.status.should.equal(200);

    res.body.count.should.equal(1);
  });

  it("Remove From Cart", async () => {
    const res = await request(app)
      .post("/public/cart/removeProduct") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        cartId,
        productId: addingProduct._id,
      });

    if (res.error) {
      console.error(res.error);
    }

    (await getCart(cartId)).body.items.length.should.equal(0);
    res.status.should.equal(200);
  });

  it("Readds Item Cart", async () => {
    const res = await addToCart(cartId, addingProduct);
    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
  });

  it("Updates Item Quantity", async () => {
    const res = await request(app)
      .post("/public/cart/updateQuantity") //
      .set("shop-id", testData.shopAtilio.doc._id)
      .send({
        cartId,
        productId: addingProduct._id,
        quantity: 3,
      });

    if (res.error) {
      console.error(res.error);
    }

    res.status.should.equal(200);
    (await getCart(cartId)).body.items[0].quantity.should.equal(3);
  });
});
