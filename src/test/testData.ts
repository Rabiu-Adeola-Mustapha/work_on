import { AdminUserDocLean } from "../models/adminUser.model";
import { CategoryDocLean } from "../models/category.model";
import { MediaDocLean } from "../models/media.model";
import { MerchantDocLean } from "../models/merchant.model";
import { ShopDocLean } from "../models/shop.model";
import { UserDocLean } from "../models/user.model";

const data = {
  userJason: {
    doc: undefined as AdminUserDocLean,
    token: "",
  },
  userIsa: {
    doc: undefined as AdminUserDocLean,
    token: "",
  },
  userMyWine: {
    doc: undefined as AdminUserDocLean,
    token: "",
  },
  shopAtilio: {
    doc: undefined as ShopDocLean,
    media1: undefined as MediaDocLean,
    cats: {
      p1: undefined as CategoryDocLean,
      p2: undefined as CategoryDocLean,
      c1: undefined as CategoryDocLean,
    },
    colorAttributeId: undefined as string,
    sizeAttributeId: undefined as string,
  },
  daydaybuy: {
    doc: undefined as ShopDocLean,
  },
  mywine: {
    doc: undefined as MerchantDocLean,
  },
  front: {
    userJason: {
      doc: undefined as UserDocLean,
      token: undefined as string,
    },
  },
};

export default data;
