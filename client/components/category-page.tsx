"use client";

import { useAuth } from "@/components/auth-context";
import { TorrentTable } from "@/components/torrent-table";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import type { Torrent } from "@/lib/types";

export function CategoryPage({ category }: { category: string }) {
  const { session } = useAuth();
  const title = category === "all" ? "All torrents" : decodeURIComponent(category).replace(/^./, (letter) => letter.toUpperCase());
  const path = session ? `/torrent/search${category === "all" ? "" : `?category=${encodeURIComponent(category)}`}` : null;
  const { data, error, loading } = useApiData<{ torrents?: Torrent[] } | Torrent[]>(path);
  const torrents = Array.isArray(data) ? data : data?.torrents ?? [];

  if (!session) return <main className="page"><SignInRequired /></main>;
  return (
    <main className="page">
      <PageHeader title={title} />
      <section className="content-section flush-section">
        <ApiState loading={loading} error={error} empty={!loading && !error && !torrents.length}><TorrentTable torrents={torrents} /></ApiState>
      </section>
    </main>
  );
}
