"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";
import bg from "@/locales/bg.json";
import en from "@/locales/en.json";

export type Locale = "en" | "bg";
type MessageKey = keyof typeof en;
type Variables = Record<string, string | number>;
const supportedLocales: Locale[] = ["en", "bg"];

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, bg };

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

function getSnapshot(): Locale {
  return window.localStorage.getItem("sq-locale") === "bg" ? "bg" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribe, getSnapshot, () => "en");
  const setStoredLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem("sq-locale", nextLocale);
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new Event("sq:locale"));
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem("sq-locale")) return;
    let active = true;
    apiFetch<{ defaultLocale?: string }>("/config", { auth: false })
      .then((config) => {
        if (
          active &&
          !window.localStorage.getItem("sq-locale") &&
          supportedLocales.includes(config.defaultLocale as Locale)
        ) {
          setStoredLocale(config.defaultLocale as Locale);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [setStoredLocale]);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      setStoredLocale(nextLocale);
    },
    t(key, variables = {}) {
      return Object.entries(variables).reduce(
        (message, [name, replacement]) => message.replaceAll(`{${name}}`, String(replacement)),
        dictionaries[locale][key] ?? dictionaries.en[key],
      );
    },
  }), [locale, setStoredLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
