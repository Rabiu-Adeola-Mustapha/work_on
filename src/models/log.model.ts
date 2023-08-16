import mongoose from "mongoose";

import NoteSchema, { NotePoJo } from "./note.model";

export type ChangeType = "orderStatus" | "paymentStatus" | "paymentMethod" | "orderNote" | "mailSent" | "mailError";

export type UserType = "admin" | "shopManager" | "system";

export interface LogPoJo {
  userType?: UserType;
  changeType: ChangeType;
  prevValue: any;
  newValue: any;
  note?: NotePoJo;
  createdAt: Date;
}

export interface LogDoc extends LogPoJo, mongoose.Document {}
export type LogModel = mongoose.Model<LogDoc>;
export type LogDocLean = mongoose.LeanDocument<LogDoc>;

const LogSchema = new mongoose.Schema<LogPoJo>({
  userType: {
    type: String,
    enum: ["admin", "shopManager", "system"],
  },
  changeType: {
    type: String,
    enum: ["orderStatus", "paymentStatus", "paymentMethod", "orderNote", "mailSent"],
    required: true,
  },
  prevValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  note: {
    type: NoteSchema,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default LogSchema;
