import { startOfDay } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";

import AdminUserModel, { AdminUserDocLean, AdminUserStatus, AdminUserType } from "../models/adminUser.model";
import FxModel from "../models/fx.model";
import adminUserUtil from "../utils/adminUser.utils";

async function createSuperAdmin(email: string, plain: string): Promise<AdminUserDocLean> {
  return await AdminUserModel.create({
    email,
    password_hash: await adminUserUtil.generateHash(plain),
    internal_password: adminUserUtil.randomInternalPassword(),
    // superadmin doesn't required a password
    type: AdminUserType.superAdmin,
    status: AdminUserStatus.created,
  });
}

async function createFxDumpRecords() {
  const now = new Date();
  const utcDate = utcToZonedTime(now, "UTC");

  await FxModel.create([
    {
      date: startOfDay(utcDate),
      from: "HKD",
      to: "USD",
      rate: 0.13,
    },
    {
      date: startOfDay(utcDate),
      from: "HKD",
      to: "CNY",
      rate: 0.88,
    },
  ]);
}

export default {
  createSuperAdmin,
  createFxDumpRecords,
};
