"use client";

import { useAuth } from "@/components/auth-context";
import { TorrentTable } from "@/components/torrent-table";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import type { Torrent } from "@/lib/types";

export function TagPage({ tag }: { tag: string }) {
  const { session } = useAuth();
  const decodedTag = decodeURIComponent(tag);
  const { data, error, loading } = useApiData<{ torrents?: Torrent[] }>(
    session ? `/torrent/search?tag=${encodeURIComponent(decodedTag)}` : null,
  );

  if (!session) return <main className="page"><SignInRequired /></main>;
  return (
    <main className="page">
      <PageHeader title={`#${decodedTag}`} />
      <ApiState loading={loading} error={error} empty={!data?.torrents?.length}>
        <TorrentTable torrents={data?.torrents} />
      </ApiState>
    </main>
  );
}
