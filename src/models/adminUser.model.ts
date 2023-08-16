import mongoose from "mongoose";

export enum AdminUserType {
  superAdmin = "superAdmin",
  regular = "regular",
}

export enum AdminUserStatus {
  pending = "pending",
  created = "created",
}

// Admin User
// Shop User
// User

export interface AdminUserRequestType {
  _id: any;
  type: AdminUserType;
  email: string;
}

export interface AdminUserPoJo {
  type: AdminUserType;
  email: string;
  password_hash: string;
  internal_password: string;
  status: AdminUserStatus;
  email_verification_code: string;
  created_at: Date;

  resetPwCode: string;
  resetPwCodeDate: Date;
}

export interface AdminUserDoc extends AdminUserPoJo, mongoose.Document {}
export type AdminUserModel = mongoose.Model<AdminUserDoc>;
export type AdminUserDocLean = mongoose.LeanDocument<AdminUserDoc>;

const schema = new mongoose.Schema<AdminUserPoJo>({
  type: {
    type: String,
    enum: Object.values(AdminUserType),
    required: true,
  },
  email: { type: String, required: true, unique: true },
  password_hash: {
    type: String,
  },
  internal_password: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(AdminUserStatus),
    default: AdminUserStatus.pending,
  },
  email_verification_code: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  resetPwCode: {
    type: String,
  },
  resetPwCodeDate: {
    type: Date,
  },
});

const model = mongoose.model<AdminUserDoc, AdminUserModel>("AdminUser", schema);

export default model;
