import { AttributeDocLean } from "../models/attribute.model";
import { CategoryDocLean } from "../models/category.model";
import { CouponDocLean } from "../models/coupon.model";
import { DiscountGroupDocLean } from "../models/discountGroup.model";
import { FormDefDocLean } from "../models/formDef.model";
import { MailTemplateDocLean } from "../models/mailTemplate.model";
import { MediaDocLean } from "../models/media.model";
import { PaySettingDocLean } from "../models/paySetting.model";
import { PickupAddrDocLean } from "../models/pickUpAddr.model";
import { ProductDocLean } from "../models/product.model";
import { ShipSettingDocLean } from "../models/shipSetting.model";
import { ShopDocLean } from "../models/shop.model";

interface FullShopData {
  shop: ShopDocLean;
  attributes: AttributeDocLean[];
  categories: CategoryDocLean[];
  coupons: CouponDocLean[];
  discountGroups: DiscountGroupDocLean[];
  formDefs: FormDefDocLean[];
  mailTemplates: MailTemplateDocLean[];
  paySettings: PaySettingDocLean[];
  pickupAddrs: PickupAddrDocLean[];
  shipSettings: ShipSettingDocLean[];
  products: ProductDocLean[];
  mediaList: MediaDocLean[];
}
