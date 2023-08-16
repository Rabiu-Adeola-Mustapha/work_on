import mongoose from "mongoose";

export interface FxPoJo {
  date: Date;
  from: string;
  to: string;
  rate: number;
  created_at: Date;
}

export interface FxDoc extends FxPoJo, mongoose.Document {}
export type FxModel = mongoose.Model<FxDoc>;
export type FxDocLean = mongoose.LeanDocument<FxDoc>;

const schema = new mongoose.Schema<FxPoJo>({
  date: {
    type: Date,
    required: true,
  },
  from: {
    type: String,
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<FxDoc, FxModel>("fx", schema);
