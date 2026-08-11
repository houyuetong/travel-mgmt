import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from '../locales/zh-CN.js';
import enUS from '../locales/en-US.js';

export const LANG_KEY = 'i18nLanguage';
export const SUPPORTED_LANGS = ['zh-CN', 'en-US'];
export const DEFAULT_LANG = 'zh-CN';

export function getSavedLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch (e) {
    return DEFAULT_LANG;
  }
  return SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG;
}

export function changeLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    // localStorage 不可用时忽略，仅会话内生效（spec 5.7.3-2）
  }
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang === 'en-US' ? 'en' : 'zh-CN';
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  lng: getSavedLanguage(),
  fallbackLng: 'zh-CN',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;