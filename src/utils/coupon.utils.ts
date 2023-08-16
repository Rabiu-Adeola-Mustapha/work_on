import CouponModel from "../models/coupon.model";

export async function generateCouponCode(length: number) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let couponCode = "";

  // Keep generating new codes until a unique one is found
  while (true) {
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      couponCode += characters.charAt(randomIndex);
    }

    const existingCoupon = await CouponModel.findOne({ code: couponCode });
    if (!existingCoupon) {
      return couponCode;
    }

    couponCode = "";
  }
}

// inputString: e.g. 2 days, 2 weeks, 2 months
export function getDateFromString(inputString: string = "3 days"): string {
  const date = new Date();
  let result: number;

  // Extract the number and unit of time from the input string
  const [numStr, unit] = inputString.split(" ");
  const num = parseInt(numStr);

  switch (unit) {
    case "days": {
      result = date.setDate(date.getDate() + num);
      break;
    }
    case "weeks": {
      result = date.setDate(date.getDate() + num * 7);
      break;
    }
    case "months": {
      result = date.setMonth(date.getMonth() + num);
      break;
    }
    default: {
      throw new Error("invalid date string");
    }
  }

  const resultDate = new Date(result);
  return resultDate.toISOString();
}
