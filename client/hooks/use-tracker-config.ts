"use client";

import { apiFetch } from "@/lib/api";
import { useEffect, useState } from "react";
import type { TrackerConfig } from "@/lib/types";

const FALLBACK_CONFIG: TrackerConfig = {
  siteName: "sqtracker demo",
  siteDescription: "A focused, private BitTorrent tracker.",
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
};

let sharedConfigPromise: Promise<TrackerConfig> | null = null;

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
    loadConfig().then((result) => {
      if (active) setConfig(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return { config: config ?? FALLBACK_CONFIG, loading: config === null };
}
