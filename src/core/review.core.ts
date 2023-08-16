import Debug from "debug";
import mongoose from "mongoose";

import ReviewModel from "../models/review.model";

// eslint-disable-next-line
const debug = Debug("project:review.core");

async function calculateAvgRatings(id: string) {
  const idObj = new mongoose.Types.ObjectId(id);
  const ratingsAverage: RatingsAvg[] = await ReviewModel.aggregate([
    { $match: { productId: idObj } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
      },
    },
  ]);

  return parseFloat(ratingsAverage[0]?.avg?.toFixed(2));
}

interface RatingsAvg {
  productId: string;
  avg: number;
}

export default {
  calculateAvgRatings,
};
