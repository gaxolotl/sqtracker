"use client";

import { useAuth } from "@/components/auth-context";
import { TorrentTable } from "@/components/torrent-table";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import type { Torrent } from "@/lib/types";

export function BookmarksPage() {
  const { session } = useAuth();
  const { data, error, loading } = useApiData<{ torrents?: Torrent[] } | Torrent[]>(session ? "/account/bookmarks" : null);
  const torrents = Array.isArray(data) ? data : data?.torrents ?? [];
  if (!session) return <main className="page"><SignInRequired /></main>;
  return <main className="page"><PageHeader title="Bookmarks" /><ApiState loading={loading} error={error} empty={!torrents.length}><TorrentTable torrents={torrents} /></ApiState></main>;
}
