import express from "express";

import adminAttributeService from "../services/adminAttribute.service";
import adminAuthService from "../services/adminAuth.service";
import adminBannerService from "../services/adminBanner.service";
import adminCategoryService from "../services/adminCategory.service";
import adminCouponService from "../services/adminCoupon.service";
import adminDiscountGroupService from "../services/adminDiscountGroup.service";
import adminExportService from "../services/adminExport.service";
import adminFormService from "../services/adminForm.service";
import adminImportService from "../services/adminImport.service";
import adminMailTemplateService from "../services/adminMailTemplate.service";
import adminMediaService from "../services/adminMedia.service";
import adminMerchantService from "../services/adminMerchant.service";
import adminOrderService from "../services/adminOrder.service";
import adminPaySettingService from "../services/adminPaySetting.service";
import adminPickupAddrService from "../services/adminPickupAddr.service";
import adminProductService from "../services/adminProduct.service";
import adminProductImportService from "../services/adminProductImport.service";
import adminShipSettingService from "../services/adminShipSetting.service";
import adminShopService from "../services/adminShop.service";
import adminUserService from "../services/adminUser.service";

const router = express.Router();

router.post("/login", adminAuthService.login);
router.post("/requestResetPwd", adminAuthService.requestResetPwd);
router.post("/resetPwd", adminAuthService.resetPwd);
router.post("/changePwd", adminAuthService.changePwd);
router.get("/me", adminAuthService.me);
router.post("/verifyUser", adminAuthService.verify);
router.get("/verifyUserStatus", adminAuthService.checkVerifyStatus);

router.get("/shop/list", adminAuthService.getShopList);
router.post("/shop/update", adminShopService.update);
router.get("/shop/get", adminShopService.get);
router.post("/shop/create", adminShopService.create);
router.post("/shop/addUser", adminShopService.addUser);
router.post("/shop/removeUser", adminShopService.removeUser);
router.post("/shop/resendInvitation", adminShopService.resendInvitation);

router.post("/pickupAddr/add", adminPickupAddrService.add);
router.get("/pickupAddr/get", adminPickupAddrService.get);
router.post("/pickupAddr/update", adminPickupAddrService.update);
router.get("/pickupAddr/list", adminPickupAddrService.list);
router.post("/pickupAddr/delete", adminPickupAddrService.deleteRecord);

router.get("/shipSetting/countryList", adminShipSettingService.getCountries);
router.post("/shipSetting/add", adminShipSettingService.add);
router.get("/shipSetting/list", adminShipSettingService.list);
router.get("/shipSetting/single", adminShipSettingService.single);
router.post("/shipSetting/update", adminShipSettingService.updateRecord);
router.post("/shipSetting/delete", adminShipSettingService.deleteRecord);
router.get("/shipSetting/hkSubdistricts", adminShipSettingService.getHkSubdistricts);

router.post("/paySetting/add", adminPaySettingService.add);
router.get("/paySetting/list", adminPaySettingService.list);
router.get("/paySetting/single", adminPaySettingService.single);
router.post("/paySetting/update", adminPaySettingService.updateRecord);
router.post("/paySetting/delete", adminPaySettingService.deleteRecord);

router.get("/product/list", adminProductService.list);
router.post("/product/create", adminProductService.create);
router.get("/product/get", adminProductService.get);
router.post("/product/update", adminProductService.update);
router.post("/product/import", adminProductImportService.importProducts);

router.post("/discountGroup/create", adminDiscountGroupService.create);
router.get("/discountGroup/list", adminDiscountGroupService.list);
router.get("/discountGroup/get", adminDiscountGroupService.getOne);
router.post("/discountGroup/edit", adminDiscountGroupService.edit);

router.post("/coupon/create", adminCouponService.create);
router.get("/coupon/list", adminCouponService.list);
router.post("/coupon/edit", adminCouponService.edit);
router.get("/coupon/get", adminCouponService.getOne);

router.get("/mailTemplate/list", adminMailTemplateService.list);
router.post("/mailTemplate/update", adminMailTemplateService.update);
router.get("/mailTemplate/get", adminMailTemplateService.get);

router.post("/category/create", adminCategoryService.create);
router.get("/category/list", adminCategoryService.list);
router.post("/category/edit", adminCategoryService.edit);
router.get("/category/get", adminCategoryService.getOne);
router.post("/category/import", adminCategoryService.importCats);

router.post("/media/upload", adminMediaService.upload);
router.post("/media/delete", adminMediaService.deleteObject);
router.get("/media/list", adminMediaService.list);
router.post("/media/listByIds", adminMediaService.listByIds);

router.get("/user/list", adminUserService.list);

router.post("/merchant/create", adminMerchantService.create);
router.get("/merchant/list", adminMerchantService.list);
router.post("/merchant/addUser", adminMerchantService.addUser);
router.get("/merchant/single", adminMerchantService.single);

router.post("/attribute/create", adminAttributeService.create);
router.get("/attribute/list", adminAttributeService.list);
router.get("/attribute/get", adminAttributeService.get);
router.post("/attribute/update", adminAttributeService.update);

router.get("/form/listDef", adminFormService.listDef);
router.get("/form/listDoc", adminFormService.listDoc);
router.get("/form/singleDef", adminFormService.singleDef);
router.get("/form/singleDoc", adminFormService.singleDoc);
router.post("/form/updateDef", adminFormService.updateDef);
router.post("/form/createDef", adminFormService.createDef);

router.post("/order/list", adminOrderService.list);
router.get("/order/get", adminOrderService.get);
router.post("/order/update", adminOrderService.update);
router.post("/order/updateShipAddr", adminOrderService.updateShipAddr);
router.post("/order/createNote", adminOrderService.createNote);
router.post("/order/updateNote", adminOrderService.updateNote);
router.post("/order/resendEmail", adminOrderService.resendEmail);

router.post("/banner/create", adminBannerService.create);
router.get("/banner/list", adminBannerService.list);
router.post("/banner/delete", adminBannerService.deleteRecord);
router.post("/banner/reOrder", adminBannerService.reOrder);

router.get("/export/fullShop", adminExportService.exportFullShop);
router.post("/import/fullShop", adminImportService.importFullShop);

export default router;
