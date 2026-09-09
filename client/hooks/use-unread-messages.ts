"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function useUnreadMessages(enabled: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    async function refresh() {
      if (document.hidden) return;
      try {
        const result = await apiFetch<{ count?: number }>(
          "/messages/unread-count",
        );
        if (!active) return;
        const nextCount = Number(result?.count);
        setCount(Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0);
      } catch {
        // Message polling must never disrupt the surrounding application shell.
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) void refresh();
    }

    function handleMessagesUpdated() {
      void refresh();
    }

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("sq:messages-updated", handleMessagesUpdated);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("sq:messages-updated", handleMessagesUpdated);
    };
  }, [enabled]);

  return enabled ? count : 0;
}
