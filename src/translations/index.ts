import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

import en from "./en.json";
import es from "./es.json";
import pt from "./pt.json";

const translations: Record<string, any> = {
  en,
  es,
  pt,
};

export function useTranslation() {
  const languageCode = useSelector((state: RootState) => state.preferences.languageCode) || "en";
  const locale = translations[languageCode] || translations.en;

  /**
   * Translates a key string (e.g. "common.send") into the localized string.
   * Supports simple template replacement for {{key}} placeholders.
   */
  const t = (key: string, params?: Record<string, string | number>) => {
    const keys = key.split(".");
    let value = locale;

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    if (value === undefined) {
      // Fallback to English if key not found in current locale
      let fallback = translations.en;
      for (const k of keys) {
        fallback = fallback?.[k];
        if (fallback === undefined) break;
      }
      value = fallback || key;
    }

    if (typeof value === "string" && params) {
      Object.entries(params).forEach(([k, v]) => {
        value = (value as string).replace(`{{${k}}}`, String(v));
      });
    }

    return value;
  };

  return { t, languageCode };
}
