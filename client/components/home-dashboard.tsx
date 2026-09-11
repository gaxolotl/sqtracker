"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Search, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { useI18n } from "@/components/i18n-context";
import { ApiState } from "@/components/ui";
import { TorrentTable } from "@/components/torrent-table";
import { useApiData } from "@/hooks/use-api-data";
import { useTrackerConfig } from "@/hooks/use-tracker-config";
import type { Torrent } from "@/lib/types";

export function HomeDashboard({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const { session } = useAuth();
  const { t } = useI18n();
  const { config } = useTrackerConfig();
  const { data: torrents, error, loading } = useApiData<Torrent[]>(session ? "/torrent/latest?count=25" : null);
  const { data: popular, error: popularError, loading: popularLoading } = useApiData<{ torrents?: Torrent[] }>(session ? "/torrent/search?sort=downloads:desc&page=0" : null);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  if (!session) {
    return (
      <main className="splash-page">
        <div className="splash-content">
          <span className="splash-mark" aria-hidden="true">■</span>
          <h1>{config.siteName}</h1>
          <p>{config.siteDescription || t("tagline")}</p>
          <div className="splash-actions">
            <Link className="primary-button button-link" href="/login"><LogIn aria-hidden="true" /> {t("login")}</Link>
            <Link className="secondary-button button-link" href="/register"><UserPlus aria-hidden="true" /> {t("register")}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page home-page">
      <div className="home-heading-row"><h1>{t("home")}</h1></div>

      <form className="hero-search" id="search" onSubmit={submitSearch}>
        <div className="hero-search-field">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchTracker")}
            aria-label={t("searchTracker")}
          />
        </div>
        <button className="primary-button" type="submit">{t("search")}</button>
      </form>

      <section className="content-section" id="browse">
        <div className="section-heading-row">
          <h2 className="section-title">{t("latestTorrents")}</h2>
        </div>
        <ApiState loading={loading} error={error} empty={!loading && !error && !torrents?.length}>
          <TorrentTable torrents={torrents ?? []} />
        </ApiState>
      </section>
      <section className="content-section home-secondary-section">
        <div className="section-heading-row">
          <h2 className="section-title">{t("popularTorrents")}</h2>
        </div>
        <ApiState loading={popularLoading} error={popularError} empty={!popularLoading && !popularError && !popular?.torrents?.length}>
          <TorrentTable torrents={popular?.torrents ?? []} />
        </ApiState>
      </section>
    </main>
  );
}
