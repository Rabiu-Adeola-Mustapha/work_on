import mongoose from "mongoose";

import { AdminUserDocLean } from "./adminUser.model";

export interface NotePoJo {
  AdminUserId?: mongoose.Types.ObjectId | AdminUserDocLean;
  // title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteDoc extends NotePoJo, mongoose.Document {}
export type NoteModel = mongoose.Model<NoteDoc>;
export type NoteDocLean = mongoose.LeanDocument<NoteDoc>;

const NoteSchema = new mongoose.Schema<NotePoJo>({
  AdminUserId: {
    type: mongoose.Types.ObjectId,
    ref: "AdminUser",
  },
  // title: {
  //   type: String,
  //   required: true,
  // },
  body: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export default NoteSchema;
