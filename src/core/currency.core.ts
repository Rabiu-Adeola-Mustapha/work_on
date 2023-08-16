import Debug from "debug";
import express from "express";

// eslint-disable-next-line
const debug = Debug("project:currency.core");

function getCurrency(req: express.Request): string {
  return req.currency ? req.currency : req.shop.default_currency;
}

export function formatCurrency(value: number, currency: string) {
  if (value === undefined) return undefined;
  return getCurrencyFormatter(currency).format(value);
}

function getCurrencyFormatter(currency: string) {
  switch (currency) {
    case "HKD":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "HKD",
      });
    case "CNY":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currencyDisplay: "narrowSymbol",
        currency: "CNY",
      });
    case "USD":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      });
  }
}

export default {
  getCurrency,
  formatCurrency,
};
