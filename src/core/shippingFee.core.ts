import Debug from "debug";
import mongoose from "mongoose";
import { FeeSettingFlat, FeeSettingFree } from "shippingSetting";

import CheckoutSessionModel, { CheckoutSessionDocLean } from "../models/checkoutSession.model";
import ShipSettingModel, {
  FeeOptionDocLean,
  ShipSettingDocLean,
  ShipSettingOptionDocLean,
  ShipType,
} from "../models/shipSetting.model";
import localeCore from "./locale.core";

// eslint-disable-next-line
const debug = Debug("project:shippingFee.core");

interface ShippingFee {
  shipOptionId: mongoose.Types.ObjectId;
  shipType: ShipType;
  feeType: string;
  feeName: string;
  fee: number;
  extraFee?: number;
  feeOptionSetting: any;
  eligible: boolean;
  status: "regular" | "missingHkRegionId" | "extraFeeAdded";
}

interface InputOption {
  shopId: string;
  userId: string;
  countryId: string;
  sessionId: string;
  hkRegionId?: string;
  locale: string;
}

interface InputOptionTotal {
  shopId: string;
  userId: string;
  countryId: string;
  sessionId: string;
  locale: string;
  shipOptionId: ShipType;
  hkRegionId?: string;
  usedReward: number;
}

interface CalculateFeeInputOption {
  locale: string;
  hkRegionId?: string;
}

async function calculate(option: InputOption): Promise<ShippingFee[]> {
  const [session, shipSettings] = await Promise.all([
    getSession(option), //
    getShipSettings(option),
  ]);

  // debug("shipSettings", shipSettings);
  const total = getTotalFromSession(session);
  return shipSettings.map((shipSetting) => calculateFee(shipSetting, total, option)).flat();
}

async function calculateTotal(option: InputOptionTotal) {
  const [session, shipSettings] = await Promise.all([
    getSession(option), //
    getShipSettings(option),
  ]);
  const total = getTotalFromSession(session);

  const shippingFees = shipSettings.map((shipSetting) => calculateFee(shipSetting, total, option)).flat();

  //   debug("shippingFees", shippingFees, "shipOptionId", option.shipOptionId);
  const matchedFee = shippingFees.find((fee) => fee.shipOptionId.toString() === option.shipOptionId && fee.eligible);

  //   debug("matchedFee", matchedFee);
  const redeemedReward = option.usedReward ? option.usedReward : 0;

  const extraFee = matchedFee.extraFee ?? 0;

  return {
    itemsTotal: total,
    shipping: matchedFee.fee, // 50
    shippingExtra: extraFee, // 20
    status: matchedFee.status,
    tax: 0,
    usedRewardTotal: option.usedReward,
    total: total + matchedFee.fee + extraFee - redeemedReward,
  };
}

function getTotalFromSession(session: CheckoutSessionDocLean) {
  return session.items.reduce((previousValue, current) => {
    const activePrice = current.discount_price > 0 ? current.discount_price : current.item_price;
    return previousValue + activePrice * current.quantity;
  }, 0);
}

function getSession(option: InputOption) {
  // debug("getSession", {
  //   shop_id: option.shopId,
  //   user_id: option.userId,
  //   _id: option.sessionId,
  // });
  return CheckoutSessionModel.findOne({
    shop_id: option.shopId,
    user_id: option.userId,
    _id: option.sessionId,
  })
    .populate({
      path: "items.product_id",
      populate: {
        path: "featured_media_id",
      },
    })
    .lean();
}

function getShipSettings(option: InputOption) {
  // debug("getShipSettings", {
  //   shopId: option.shopId,
  //   countryIds: { $in: option.countryId },
  // });
  return ShipSettingModel.find({
    shopId: option.shopId,
    countryIds: { $in: option.countryId },
  }).lean();
}

function calculateFee(
  shipSetting: ShipSettingDocLean,
  total: number,
  inputOption: CalculateFeeInputOption
): ShippingFee[] {
  return shipSetting.options.map((option) => getFeeOptions(option, total, inputOption)).flat();
}

function isHksubDisctractChargesSet(option: ShipSettingOptionDocLean) {
  if (option.hkSubDistrictCharges === undefined) return false;
  if (option.hkSubDistrictCharges === null) return false;
  if (option.hkSubDistrictCharges.length === 0) return false;

  return true;
}

function getFeeOptions(
  option: ShipSettingOptionDocLean,
  total: number,
  inputOption: CalculateFeeInputOption
): ShippingFee[] {
  const options = option.feeOptions.map((feeOption) => {
    const value: ShippingFee = {
      shipOptionId: option._id,
      shipType: option.shipType,
      feeType: feeOption.feeType,
      feeName: localeCore.getDefaultLocaleText(inputOption.locale, feeOption.name),
      fee: calculateFeeFromFeeOption(feeOption, total),
      feeOptionSetting: feeOption.setting,
      eligible: isEligible(feeOption, total),
      status: "regular",
    };

    if (value.fee === null) {
      return value;
    }

    if (isHksubDisctractChargesSet(option) && !inputOption.hkRegionId) {
      value.fee = undefined;
      value.status = "missingHkRegionId";
      return value;
    }

    const extraCharge = getHkSubDistrictExtraCharge(option, feeOption, inputOption);
    if (extraCharge) {
      value.extraFee = extraCharge.charge;
      value.status = "extraFeeAdded";
      return value;
    }

    return value;
  });

  if (options.length === 0) return [];

  const eligibleOptions = options.filter((o) => o.eligible);

  let sortedEligibleOptions: ShippingFee[] = [];

  if (eligibleOptions.length > 0) {
    sortedEligibleOptions = eligibleOptions.sort((a, b) => {
      if (a.fee > b.fee) return 1;
      if (a.fee < b.fee) return -1;
      return 0;
    });
  }

  const nonEligibleOptions = options.filter((o) => !o.eligible);

  return [sortedEligibleOptions[0], ...nonEligibleOptions];
}

function isEligible(feeOption: FeeOptionDocLean, total: number) {
  switch (feeOption.feeType) {
    case "flat":
      return isEligibleFlat(feeOption.setting as FeeSettingFlat, total);
    case "free":
      return isEligibleFree(feeOption.setting as FeeSettingFree, total);
    default:
      return false;
  }
}

function isEligibleFree(setting: FeeSettingFree, total: number) {
  return total >= setting.freeAmtAbove;
}

function isEligibleFlat(setting: FeeSettingFlat, total: number) {
  return total >= setting.amtAbove;
}

function calculateFeeFromFeeOption(feeOption: FeeOptionDocLean, total: number) {
  // debug("calculateFeeFromFeeOption feeType", feeOption);
  switch (feeOption.feeType) {
    case "flat":
      return calculateFeeFlat(feeOption.setting as FeeSettingFlat, total);
    case "free":
      return calculateFeeFree(feeOption.setting as FeeSettingFree, total);
    default:
      return null;
  }
}

function getHkSubDistrictExtraCharge(
  option: ShipSettingOptionDocLean,
  feeOption: FeeOptionDocLean,
  inputOption: CalculateFeeInputOption
) {
  if (!inputOption.hkRegionId) return null;
  if (feeOption.excludeHkSubDistrictCharge) return null;
  if (!option.hkSubDistrictCharges) return null;

  return option.hkSubDistrictCharges.find((i) =>
    (i.hkRegionId as mongoose.Types.ObjectId).equals(inputOption.hkRegionId)
  );
}

function calculateFeeFree(setting: FeeSettingFree, total: number) {
  if (total >= setting.freeAmtAbove) return 0;

  // return null;
}

function calculateFeeFlat(setting: FeeSettingFlat, total: number) {
  if (total >= setting.amtAbove) return setting.flat;
  return null;
}

export default {
  calculate,
  calculateTotal,
};
