"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import bg from "@/locales/bg.json";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import eo from "@/locales/eo.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";
import ru from "@/locales/ru.json";
import zh from "@/locales/zh.json";

export type Locale =
  "en" | "bg" | "de" | "eo" | "es" | "fr" | "it" | "ru" | "zh";
export type MessageKey = keyof typeof en;
type Variables = Record<string, string | number>;
export const supportedLocales: Locale[] = [
  "en",
  "bg",
  "de",
  "eo",
  "es",
  "fr",
  "it",
  "ru",
  "zh",
];

export const localeNames: Record<Locale, string> = {
  en: "English",
  bg: "Български",
  de: "Deutsch",
  eo: "Esperanto",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  ru: "Русский",
  zh: "中文",
};

const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  en,
  bg,
  de,
  eo,
  es,
  fr,
  it,
  ru,
  zh,
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, variables?: Variables) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("sq:locale", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("sq:locale", callback);
  };
}

export function I18nProvider({
  children,
  defaultLocale = "en",
}: {
  children: React.ReactNode;
  defaultLocale?: string;
}) {
  const initialLocale = supportedLocales.includes(defaultLocale as Locale)
    ? (defaultLocale as Locale)
    : "en";
  const getSnapshot = useCallback(() => {
    const stored = window.localStorage.getItem("sq-locale") as Locale | null;
    return stored && supportedLocales.includes(stored) ? stored : initialLocale;
  }, [initialLocale]);
  const locale = useSyncExternalStore<Locale>(
    subscribe,
    getSnapshot,
    () => initialLocale,
  );
  const setStoredLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem("sq-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new Event("sq:locale"));
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale(nextLocale) {
        setStoredLocale(nextLocale);
      },
      t(key, variables = {}) {
        return Object.entries(variables).reduce(
          (message, [name, replacement]) =>
            message.replaceAll(`{${name}}`, String(replacement)),
          dictionaries[locale][key] ?? dictionaries.en[key],
        );
      },
    }),
    [locale, setStoredLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
