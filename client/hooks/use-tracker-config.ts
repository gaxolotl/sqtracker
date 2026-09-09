"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import type { TrackerConfig } from "@/lib/types";

const FALLBACK_CONFIG: TrackerConfig = {
  siteName: "sqtracker demo",
  siteDescription: "A focused, private BitTorrent tracker.",
  showPageInTitle: true,
  allowRegister: "open",
  allowAnonymousUploads: false,
  categories: {
    Movies: ["BluRay", "WebDL", "HDRip", "WebRip", "DVD", "Cam"],
    TV: [],
    Books: [],
    Music: [],
    Games: [],
    Software: [],
  },
  siteWideFreeleech: false,
  allowUnregisteredView: false,
  defaultLocale: "en",
  avatarMaxResolution: 512,
  avatarMaxSizeKb: 512,
  allowGifAvatars: true,
};

let sharedConfigPromise: Promise<TrackerConfig> | null = null;

export function refreshTrackerConfig() {
  sharedConfigPromise = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sq:config"));
  }
}

function loadConfig(): Promise<TrackerConfig> {
  if (!sharedConfigPromise) {
    sharedConfigPromise = apiFetch<TrackerConfig>("/config", { auth: false })
      .then((config) => ({ ...FALLBACK_CONFIG, ...config }))
      .catch(() => FALLBACK_CONFIG);
  }
  return sharedConfigPromise;
}

export function useTrackerConfig() {
  const [config, setConfig] = useState<TrackerConfig | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void loadConfig().then((result) => {
        if (active) setConfig(result);
      });
    };
    refresh();
    window.addEventListener("sq:config", refresh);
    return () => {
      active = false;
      window.removeEventListener("sq:config", refresh);
    };
  }, []);

  return { config: config ?? FALLBACK_CONFIG, loading: config === null };
}
