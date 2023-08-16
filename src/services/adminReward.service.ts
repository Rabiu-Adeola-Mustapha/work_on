// import express from "express";
// import { body, query } from "express-validator";

// import shopIdMw from "../middleware/shopId.mw";
// import { validateResult } from "../middleware/validator.mw";
// import RewardSettingModel from "../models/rewardSetting.model";
// import ShopModel from "../models/shop.model";

// const create = [
//   shopIdMw,
//   body("name").isString().withMessage("Invalid reward name"),
//   body("description").isString().withMessage("invalid description"),
//   body("pointValue").isNumeric().withMessage("invalid points value"),
//   validateResult,
//   async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     try {
//       const shop = await ShopModel.findOne({ _id: req.shop._id }).lean();

//       const reward = await RewardSettingModel.create({
//         shopId: shop._id,
//         name: req.data.name,
//         description: req.data.description,
//         pointValue: req.data.pointValue,
//       });

//       res.json(reward);
//     } catch (e) {
//       next(e);
//     }
//   },
// ];

// const list = [
//   shopIdMw,
//   validateResult,
//   async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     try {
//       const rewards = await RewardSettingModel.find({ shopId: req.shop._id }).lean();

//       res.json(rewards);
//     } catch (e) {
//       next(e);
//     }
//   },
// ];

// const edit = [
//   shopIdMw,
//   query("rewardId").exists().isMongoId().withMessage("Missing id"),
//   body("name").isString().withMessage("Invalid reward name"),
//   body("description").isString().withMessage("invalid description"),
//   validateResult,
//   async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     try {
//       const reward = await RewardSettingModel.findOneAndUpdate(
//         { _id: req.data.rewardId, shopId: req.shop._id },
//         {
//           $set: {
//             name: req.data.name,
//             description: req.data.description,
//           },
//         },
//         { new: true }
//       );

//       res.json(reward);
//     } catch (e) {
//       next(e);
//     }
//   },
// ];

// const getOne = [
//   shopIdMw,
//   query("rewardId").exists().isMongoId().withMessage("Missing id"),
//   validateResult,
//   async (req: express.Request, res: express.Response, next: express.NextFunction) => {
//     try {
//       const reward = await RewardSettingModel.findOne({
//         _id: req.data.rewardId,
//         shop_id: req.shop._id,
//       }).lean();

//       res.json(reward);
//     } catch (e) {
//       next(e);
//     }
//   },
// ];

// export default { create, list, edit, getOne };
