import express from "express";

import attrService from "../services/attribute.service";
import cartService from "../services/cart.service";
import categoryService from "../services/category.service";
import checkoutService from "../services/checkout.service";
import discountGroupService from "../services/discountGroup.service";
import formService from "../services/form.service";
import orderService from "../services/order.service";
import payService from "../services/pay.service";
import productService from "../services/product.service";
import reviewService from "../services/review.service";
import rewardService from "../services/reward.service";
import shipAddrService from "../services/shipAddr.service";
import shopService from "../services/shop.service";
import userService from "../services/shopUser.service";
import webhookService from "../services/webhook.service";
import wishListService from "../services/wishList.service";

const router = express.Router();

router.post("/product/list", productService.list);
router.get("/product/single/:productId", productService.single);

router.post("/discountGroup/list", discountGroupService.listProducts);

router.get("/category/list", categoryService.list);

router.get("/attribute/list", attrService.list);

router.get("/cart/getId", cartService.getId);
router.post("/cart/addProduct", cartService.addProduct);
router.post("/cart/removeProduct", cartService.removeProduct);
router.post("/cart/updateQuantity", cartService.updateQuantity);
router.get("/cart/get", cartService.get);
router.get("/cart/getCount", cartService.getCount);

router.get("/wishList/getId", wishListService.getId);
router.post("/wishList/update", wishListService.update);
router.get("/wishList/get", wishListService.get);

router.post("/user/register", userService.register);
router.post("/user/loginByEmail", userService.loginByEmail);
router.post("/user/loginByMobile", userService.loginByMobile);
router.post("/user/verifySmsOtp", userService.verifySmsOtp);
router.post("/user/resendOtp", userService.resendOtp);
router.post("/user/requestResetPwd", userService.requestResetPwd);
router.post("/user/resetPwd", userService.resetPwd);
router.get("/user/profile", userService.getProfile);
router.post("/user/updateProfile", userService.updateProfile);
router.post("/user/updateEmail", userService.updateEmail);
router.post("/user/updateTel", userService.updateTel);
router.post("/user/updateTelVerifySmsOtp", userService.updateTelVerifySmsOtp);
router.post("/user/verifyEmail", userService.verifyEmail);
router.post("/user/verifyEmailCode", userService.verifyEmailCode);
router.post("/user/addShipAddr", shipAddrService.addAddress);
router.post("/user/updateShipAddr", shipAddrService.updateAddress);
router.post("/user/deleteShipAddr", shipAddrService.deleteAddress);
router.get("/user/shipAddrs", shipAddrService.getAddrs);

router.get("/shop/get", shopService.get);
router.get("/shop/shippingCountries", shopService.getShippingCountries);
router.get("/shop/regionsHK", shopService.getHkRegions);

router.post("/checkout/createSession", checkoutService.createSession);
router.get("/checkout/getSession", checkoutService.getSession);
router.post("/checkout/updateSession", checkoutService.updateSession);
router.get("/checkout/calculateShipping", checkoutService.calculateShipping);
router.get("/checkout/calculateTotal", checkoutService.calculateTotal);

router.post("/order/createOrder", orderService.create);
router.post("/order/updatePayment", orderService.updatePaymentMethod);
router.post("/order/uploadProof", orderService.uploadProof);
router.post("/order/cancel", orderService.cancel);
router.get("/order/list", orderService.list);
router.get("/order/single/:orderId", orderService.single);

router.post("/review/create", reviewService.create);
router.post("/review/list", reviewService.list);
router.post("/review/getPending", reviewService.getPending);

router.get("/rewardRecord/list", rewardService.list);

router.get("/ship/sfSubDistricts", shipAddrService.getSfSubDistricts);
router.get("/ship/sfLocations", shipAddrService.getSfLocations);
router.get("/ship/sfLocation", shipAddrService.getSfLocation);
router.get("/ship/pickupAddrs", shipAddrService.getPickupAddrs);
router.get("/ship/settings", shipAddrService.getShipSettings);

router.get("/pay/options", payService.getOptions);
router.post("/webhook/stripeWebhook", webhookService.stripeWebhook);
router.post("/webhook/paypalWebhook", webhookService.paypalWebhook);
router.post("/webhook/codWebhook", webhookService.codWebhook);

router.post("/form/send", formService.send);

export default router;
