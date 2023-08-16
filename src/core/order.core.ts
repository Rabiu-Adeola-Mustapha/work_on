import Debug from "debug";
import express from "express";
import mongoose from "mongoose";

import { MediaDocLean, resMedia } from "../models/media.model";
import OrderModel, { OrderPoJo, resOrder } from "../models/order.model";
import { OrderProductDocLean, OrderProductPoJo } from "../models/orderProduct.model";
import PaySettingModel, { CodSetting } from "../models/paySetting.model";
import { PickupAddrPoJo } from "../models/pickUpAddr.model";
import { ProductDocLean } from "../models/product.model";
import { SfLocationPoJo } from "../models/sfLocation.model";
import { ShipAddrPoJo } from "../models/shipAddr.model";
import { AddressType } from "../models/shipSetting.model";
import ShopModel, { ShopDocLean } from "../models/shop.model";
import { UserDocLean } from "../models/user.model";
import counterCore from "./counter.core";
import currencyCore from "./currency.core";
import localeCore from "./locale.core";

// import reviewCore from "./review.core";

// eslint-disable-next-line
const debug = Debug("project:order.core");

const getOrderShipCreate = (req: express.Request, user: UserDocLean): Partial<OrderPoJo> => {
  const { addrType, shipAddrId, sfLocation, pickupAddr } = req.data;

  if (addrType === "regular") {
    const shipAddr = user.ship_addrs.find((addr) => addr._id.equals(shipAddrId));

    delete shipAddr._id;
    delete shipAddr.created_at;
    delete shipAddr.is_default;
    delete shipAddr.sub_district_id;

    return {
      shipAddr,
    };
  }

  if (addrType === "sfLocation") {
    return {
      sfLocation: {
        code: sfLocation.code,
        sub_district: sfLocation.subDistrict,
        address: sfLocation.address,
        service_partner: sfLocation.servicePartner,
        shipping_method: sfLocation.shippingMethod,
        is_hot: sfLocation.isHot,
        hours_monfri: sfLocation.hoursMonFri,
        hours_satsun: sfLocation.hoursSatSun,
      },
    };
  }

  if (addrType === "pickupLocation") {
    return {
      pickupAddr: {
        country_id: pickupAddr.countryId,
        addr: pickupAddr.addr,
        tel: pickupAddr.tel,
        opening_hour: pickupAddr.openingHour,
      },
    };
  }
  throw new Error("invalid ship type");
};

const getOrderShipRes = (
  {
    addrType,
    shipAddr,
    sfLocation,
    pickupAddr,
  }: {
    addrType: AddressType;
    shipAddr?: Omit<ShipAddrPoJo, "created_at">;
    sfLocation?: Omit<SfLocationPoJo, "created_at" | "service_partner_type">;
    pickupAddr?: Omit<PickupAddrPoJo, "created_at" | "shop_id">;
  },
  locale: string
) => {
  switch (addrType) {
    case "regular":
      return (
        shipAddr && {
          shipAddr: {
            countryCode: shipAddr.country_code,
            recipientName: shipAddr.recipient_name,
            address: shipAddr.address,
            region: shipAddr.region,
            district: shipAddr.district,
            subDistrict: shipAddr.subDistrict,
            addrType: shipAddr.addr_type,
            tel: shipAddr.tel,
            telCountryCode: shipAddr.tel_country_code,
            state: shipAddr.state,
            city: shipAddr.city,
            zipCode: shipAddr.zip_code,
          },
        }
      );

    case "sfLocation":
      return {
        sfLocation: {
          code: sfLocation.code,
          subDistrict: sfLocation.sub_district,
          address: localeCore.getDefaultLocaleText(locale, sfLocation.address),
          servicePartner: sfLocation.service_partner,
          shippingMethod: sfLocation.shipping_method,
          isHot: sfLocation.is_hot,
          hoursMonFri: sfLocation.hours_monfri,
          hoursSatSun: sfLocation.hours_satsun,
        },
      };

    case "pickupLocation":
      return {
        pickupAddr: {
          countryId: pickupAddr.country_id,
          addr: pickupAddr.addr,
          tel: pickupAddr.tel,
          openingHour: pickupAddr.opening_hour,
        },
      };

    //  default:
    //    throw new Error("invalid addr type");
  }
};

const getOrderProducts = (items: any[], products: ProductDocLean[], productPrefix: string): OrderProductDocLean[] => {
  return items.map((i: any) => {
    const product: ProductDocLean = products.find((p) => p._id.equals(i.productId));
    const productNumber = counterCore.getFormattedSequence(productPrefix, product.product_number);

    return {
      _id: product._id,
      merchantId: (product.merchant_id as mongoose.Types.ObjectId)?.toString(),
      productNumber,
      name: product.name,
      price: product.price,
      quantity: i.quantity,
      description: product.description,
      shortDescription: product.shortDescription,
      featuredMedia:
        product.featured_media_id === undefined ? undefined : resMedia(product.featured_media_id as MediaDocLean),
      galleries: (product.gallery_ids as MediaDocLean[]).map(resMedia),
      descriptionGalleries: (product.description_gallery_ids as MediaDocLean[]).map(resMedia),
      categoryIds: product.category_ids as mongoose.Types.ObjectId[],
      sku: product.sku,
      isPromotionProduct: product.is_promotion_product,
      parentId: (product.parent_id as mongoose.Types.ObjectId)?.toString(),
      attributes: product.attributes,
      rewardPayout: product.rewardPayout,
      relatedProductIds: product.relatedProductIds as mongoose.Types.ObjectId[],
      discountPrice: i.discountPrice,
      discountLinkId: i.discountLinkId,
    };
  });
};

const getOrderProductsRes = (product: OrderProductPoJo, locale: string, currency: string, shop: ShopDocLean) => {
  return {
    id: product._id,
    name: localeCore.getDefaultLocaleText(locale, product.name),
    description: localeCore.getDefaultLocaleText(locale, product.description),
    shortDescription: localeCore.getDefaultLocaleText(locale, product.shortDescription),
    price: product.price,
    quantity: product.quantity,
    discountPrice: product.discountPrice,
    discountLinkId: product.discountLinkId,
    productNumber: product.productNumber,
    galleries: product.galleries,
    descriptionGalleries: product.descriptionGalleries,
    featureMedia: product.featuredMedia,
    categoryIds: product.categoryIds,
    currency,
    sku: product.sku,
    //  averageRatings: await reviewCore.calculateAvgRatings(product._id),
    relatedProductIds: product.relatedProductIds,
    rewardPayout: product.rewardPayout ?? shop.rewardPayout,
  };
};

const getEmailData = async (orderId: string, shopId: string, locale: string, currency: string) => {
  const [order, shop] = await Promise.all([
    OrderModel.findById({ _id: orderId }).lean(),
    ShopModel.findById({ _id: shopId }).populate("logo_media_id").lean(),
  ]);
  const orderRes = resOrder(order, shop, locale);
  const paySetting = await PaySettingModel.findById({ _id: orderRes.activePaymentSession.payOptionId });
  const paymentOnDelivery = (paySetting.setting as CodSetting).paymentOnDelivery;
  // debug(paySetting);

  return {
    orderId: orderRes.id,
    orderNumber: orderRes.orderNumber,
    userName: orderRes.user.firstName,
    addrType: order.addrType,
    year: new Date().getFullYear(),
    shopLogoUrl: (shop.logo_media_id as MediaDocLean)?.url,
    orderDate: new Date(order.createdAt).toLocaleDateString(),
    paymentName: orderRes.activePaymentSession.paymentName.en,
    recipientName: orderRes.shipAddr?.recipientName || orderRes.user.firstName,
    shippingAddress: orderRes.shipAddr?.address,
    pickupLocation: orderRes.pickupAddr?.addr || orderRes.sfLocation?.address,
    shipName: orderRes.shipName,
    addBankDetails: paySetting.payType === "cod" && !paymentOnDelivery,
    orderTotal: currencyCore.formatCurrency(orderRes.total, currency),
    shipTotal: currencyCore.formatCurrency(orderRes.shipTotal, currency),
    rewardRedeemed: currencyCore.formatCurrency(orderRes.rewardRedeemed, currency),
    itemsTotal: currencyCore.formatCurrency(orderRes.itemsTotal, currency),
    orderItems: order.products.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      discountedFrom: currencyCore.formatCurrency(p.price, currency), // initial price before any discount
      price: currencyCore.formatCurrency(p.discountPrice ?? p.price, currency),
      imgUrl: p.featuredMedia?.thumbnailUrl,
      total: currencyCore.formatCurrency(p.discountPrice ?? p.price * p.quantity, currency),
    })),
  };
};

export default { getOrderShipRes, getOrderShipCreate, getOrderProducts, getOrderProductsRes, getEmailData };
