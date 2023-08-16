import express from "express";

import orderService from "../services/order.service";
import userService from "../services/shopUser.service";
import testService from "../services/test.service";

const router = express.Router();

if (process.env.NODE_ENV === "test") {
  router.post("/init", testService.testInit);
  router.post("/cleanFrontUsers", testService.cleanFrontUsers);
  router.get("/user/getSmsOtp", userService.getSmsOtp);
  router.get("/user/getUpdatingSmsOtp", userService.getUpdatingSmsOtp);
  router.get("/getLastMails", testService.getLastMails);
  router.post("/clone100Products", testService.clone100Products);
  router.post("/create300Orders", orderService.create300Orders);
  router.post("/createTestOrders", orderService.createTestOrders);
}

export default router;
