import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

const getInitialLanguage = (): string => {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return "en";
  }
  const browserLang = navigator.language.split("-")[0];
  return ["en", "zh"].includes(browserLang) ? browserLang : "en";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
