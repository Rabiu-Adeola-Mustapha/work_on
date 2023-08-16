import mongoose from "mongoose";

import { startPromise } from "../app";
import adminMediaService from "../services/adminMedia.service";
import adminUserTask from "../tasks/adminUser.task";
import shopTask from "../tasks/shop.task";

describe("Init Test", async () => {
  it("Drop Database", async () => {
    await startPromise;
    await mongoose.connection.db.dropDatabase();
    console.log("Database Dropped");

    await mongoose.connection.syncIndexes();

    await adminMediaService.deleteAllObjects();
    await Promise.all([
      adminUserTask.createFxDumpRecords(), //
      shopTask.addCountryList(),
      shopTask.addHkRegions(),
      shopTask.createSfLocations(),
    ]);
  });
});
