import mongoose from "mongoose";

import UserModel from "../models/user.model";
import adminMediaService from "../services/adminMedia.service";
import adminUser from "./adminUser.task";
import shopTask from "./shop.task";

export async function testInitStart() {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.syncIndexes();
  const user = await adminUser.createSuperAdmin("jason.ching@hishk.com", "pass");

  // console.time("cleanup");

  await Promise.all([
    shopTask.createShopAttilio(user._id),
    shopTask.createOfficeman(user._id),
    shopTask.addCountryList(),
    shopTask.addHkRegions(),
    adminUser.createFxDumpRecords(),
    adminMediaService.deleteAllObjects(),
  ]);

  shopTask
    .createSfLocations()
    .then(() => "createSfLocations Completed")
    .catch((e) => console.error("Error in createSfLocations", e));

  // console.timeEnd("cleanup");
}

export async function start() {
  // await dbInit.connect();
  // await shopTask.cleanRegionAndLocation();
  // await shopTask.addHkRegions();
  // await shopTask.createSfLocations();
  // await shopTask.updateSfLocationSubDistrictsToEn();
  // const user = await adminUser.createSuperAdmin("jason.ching@hishk.com", "pass");
  // const shop = await shopTask.createShopAttilio(user._id);
  // await productTask.createDummyProducts(shop._id);
  // await shopTask.addCountryList();
}

export async function removeAllFrontUsers() {
  await UserModel.deleteMany();
}

start()
  .then(() => {
    console.log("completed");
  })
  .catch((e) => {
    console.log("error", e);
  });
