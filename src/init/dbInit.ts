import mongoose from "mongoose";

import config from "../utils/config";

async function connect(): Promise<typeof mongoose> {
  console.log("connecting to: ", config.database);
  const m = await mongoose.connect(config.database);
  await mongoose.connection.syncIndexes();
  console.log("Connected to Database", config.database);
  return m;
}

export default {
  connect,
};
