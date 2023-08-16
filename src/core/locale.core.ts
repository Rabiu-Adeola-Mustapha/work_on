import Debug from "debug";

import { LocaleOption, LocaleOptionType, LocaleTextPoJo } from "../models/locale.model";

// eslint-disable-next-line
const debug = Debug("project:locale.core");

function getDefaultLocaleText(locale: string, localeText: LocaleTextPoJo): string {
  if (localeText === undefined) return undefined;

  switch (locale) {
    case LocaleOption.en:
      return localeText.en;
    case LocaleOption.zhHans:
      return localeText.zhHans;
    case LocaleOption.zhHant:
      return localeText.zhHant;
    default:
      return undefined;
  }
}

function getLocaleField(locale: LocaleOptionType) {
  switch (locale) {
    case "en":
      return "en";
    case "zh-Hans":
      return "zhHans";
    case "zh-Hant":
      return "zhHant";
    default:
      return null;
  }
}

export default {
  getDefaultLocaleText,
  getLocaleField,
};
