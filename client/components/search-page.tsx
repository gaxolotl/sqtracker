"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { TorrentTable } from "@/components/torrent-table";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import type { Torrent } from "@/lib/types";

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const path = session && initialQuery ? `/torrent/search?query=${encodeURIComponent(initialQuery)}` : null;
  const { data, error, loading } = useApiData<{ torrents?: Torrent[] } | Torrent[]>(path);
  const torrents = Array.isArray(data) ? data : data?.torrents ?? [];

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  if (!session) return <main className="page"><SignInRequired /></main>;
  return (
    <main className="page">
      <PageHeader title="Search" />
      <form className="hero-search search-page-form" onSubmit={submit}>
        <div className="hero-search-field"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, category, source, or tag" autoFocus /></div>
        <button className="primary-button" type="submit">Search</button>
      </form>
      {initialQuery ? <section className="content-section"><h2 className="section-title">Results for “{initialQuery}”</h2><ApiState loading={loading} error={error} empty={!loading && !error && !torrents.length}><TorrentTable torrents={torrents} /></ApiState></section> : null}
    </main>
  );
}
