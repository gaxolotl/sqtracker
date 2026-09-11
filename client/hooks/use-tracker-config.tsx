"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { TrackerConfig } from "@/lib/types";

type TrackerConfigContextValue = {
  config: TrackerConfig;
  updateConfig: (config: Partial<TrackerConfig>) => void;
};

const TrackerConfigContext = createContext<TrackerConfigContextValue | null>(
  null,
);

export function TrackerConfigProvider({
  children,
  initialConfig,
}: {
  children: React.ReactNode;
  initialConfig: TrackerConfig;
}) {
  const [config, setConfig] = useState(initialConfig);
  const updateConfig = useCallback((next: Partial<TrackerConfig>) => {
    setConfig((current) => ({ ...current, ...next }));
  }, []);
  const value = useMemo(
    () => ({ config, updateConfig }),
    [config, updateConfig],
  );

  return (
    <TrackerConfigContext.Provider value={value}>
      {children}
    </TrackerConfigContext.Provider>
  );
}

export function useTrackerConfig() {
  const context = useContext(TrackerConfigContext);
  if (!context)
    throw new Error(
      "useTrackerConfig must be used inside TrackerConfigProvider",
    );
  return context;
}
