"use client";

import { apiFetch, getStoredSession } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export function useApiData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    if (!path) return;
    const requestPath = path;
    let active = true;

    async function load() {
      if (!getStoredSession()) {
        if (active) {
          setError("Sign in to load tracker data.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await apiFetch<T>(requestPath);
        if (active) setData(result);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to reach the API.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [path, version]);

  return { data, error, loading, reload, setData };
}
