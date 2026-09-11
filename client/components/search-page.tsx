"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { TorrentTable } from "@/components/torrent-table";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { useTrackerConfig } from "@/hooks/use-tracker-config";
import { apiFetch } from "@/lib/api";
import type { Torrent } from "@/lib/types";
import { torrentDisplayName, torrentReleaseDetail } from "@/lib/torrents";

function suggestionDetail(torrent: Torrent) {
  const details = [torrent.type, torrentReleaseDetail(torrent)];
  return details.filter(Boolean).join(" / ");
}

function suggestionPoster(path?: string) {
  return path?.startsWith("/")
    ? `https://image.tmdb.org/t/p/w185${path}`
    : undefined;
}

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const { config } = useTrackerConfig();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Torrent[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const path =
    session && initialQuery
      ? `/torrent/search?query=${encodeURIComponent(initialQuery)}`
      : null;
  const { data, error, loading } = useApiData<
    { torrents?: Torrent[] } | Torrent[]
  >(path);
  const torrents = Array.isArray(data) ? data : (data?.torrents ?? []);

  useEffect(() => {
    const searchQuery = query.trim();
    if (!session || searchQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const result = await apiFetch<{ results?: Torrent[] }>(
          `/torrent/suggestions?query=${encodeURIComponent(searchQuery)}`,
          { signal: controller.signal },
        );
        setSuggestions(result.results ?? []);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, session]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const searchQuery = query.trim();
    if (!searchQuery) return;
    setSuggestionsOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  }

  if (!session)
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );

  const showSuggestions =
    suggestionsOpen &&
    query.trim().length >= 2 &&
    (suggestionsLoading || suggestions.length > 0);

  return (
    <main className="page">
      <PageHeader title="Search" />
      <form className="hero-search search-page-form" onSubmit={submit}>
        <div
          className="hero-search-field search-suggest-field"
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setSuggestionsOpen(false);
            }
          }}
        >
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            maxLength={200}
            onChange={(event) => {
              setQuery(event.target.value);
              setSuggestions([]);
              setSuggestionsLoading(false);
              setSuggestionsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSuggestionsOpen(false);
            }}
            placeholder="Try: The Rookie season 6 episode 3"
            aria-label="Search torrents"
            aria-autocomplete="list"
            aria-controls="torrent-search-suggestions"
            aria-expanded={showSuggestions}
            role="combobox"
            autoComplete="off"
            autoFocus
          />
          {showSuggestions ? (
            <div className="search-suggestions" id="torrent-search-suggestions">
              <div className="search-suggestions-heading">
                <span>Matching torrents</span>
                {suggestionsLoading ? <small>Updating...</small> : null}
              </div>
              {suggestions.length ? (
                <ul>
                  {suggestions.map((torrent) => (
                    <li key={torrent.infoHash}>
                      <Link
                        className={
                          torrent.tmdb?.posterPath
                            ? "search-suggestion-with-art"
                            : undefined
                        }
                        href={`/torrent/${torrent.infoHash}`}
                        title={torrent.name}
                      >
                        {suggestionPoster(torrent.tmdb?.posterPath) ? (
                          <Image
                            className="search-suggestion-art"
                            src={suggestionPoster(torrent.tmdb?.posterPath)!}
                            width={60}
                            height={90}
                            sizes="(max-width: 480px) 48px, 60px"
                            alt=""
                          />
                        ) : null}
                        <span className="search-suggestion-copy">
                          <strong>
                            {torrentDisplayName(
                              torrent,
                              config.shortenMatchedTorrentNames,
                            )}
                          </strong>
                          {suggestionDetail(torrent) ? (
                            <small>
                              {config.shortenMatchedTorrentNames
                                ? suggestionDetail(torrent)
                                : torrent.type}
                            </small>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        <button className="primary-button" type="submit">
          Search
        </button>
      </form>
      {initialQuery ? (
        <section className="content-section">
          <h2 className="section-title">
            Results for &quot;{initialQuery}&quot;
          </h2>
          <ApiState
            loading={loading}
            error={error}
            empty={!loading && !error && !torrents.length}
          >
            <TorrentTable torrents={torrents} />
          </ApiState>
        </section>
      ) : null}
    </main>
  );
}
