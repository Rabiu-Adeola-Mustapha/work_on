import mongoose from "mongoose";

import CounterModel from "../models/counter.model";

async function getNextSequence(shopId: mongoose.Types.ObjectId | string, counterType: string): Promise<number> {
  const counter = await CounterModel.findOneAndUpdate({ shopId, counterType }, { $inc: { seq: 1 } }, { new: true });
  return counter.seq;
}

function getFormattedSequence(prefix: string, sequence: number, padding?: number): string {
  return `${prefix}${String(sequence).padStart(padding || 5, "0")}`;
}

/*
 * @DESC check if provided value is greater than current sequence
 ** and update. else skip
 */
async function getUpdatedSequence(newValue: number, prevValue: number, shopId: string) {
  const counter = await CounterModel.findOne({ shopId, counterType: "order" });

  if (newValue >= counter.seq) {
    const newCounter = await CounterModel.findOneAndUpdate(
      { shopId, counterType: "order" },
      { $set: { seq: newValue } },
      { new: true }
    );
    return newCounter.seq;
  } else if (newValue === prevValue) {
    return newValue;
  } else {
    throw new Error("update order number cannot be less than current value");
  }
}

export default {
  getNextSequence,
  getUpdatedSequence,
  getFormattedSequence,
};
