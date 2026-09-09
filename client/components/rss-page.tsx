"use client";

import { Copy, RefreshCw, Rss } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-context";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch, apiOrigin } from "@/lib/api";

type RssAccess = { token: string };

export function RssPage() {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const access = useApiData<RssAccess>(session ? "/account/rss-token" : null);
  const feedUrl = (() => {
    if (!access.data?.token) return "";
    const parameters = new URLSearchParams({ token: access.data.token });
    if (query) parameters.set("query", query);
    return `${apiOrigin()}/rss?${parameters}`;
  })();

  if (!session)
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("Feed URL updated.");
  }

  async function copyFeed() {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setMessage("Feed URL copied.");
  }

  async function regenerateToken() {
    if (
      !window.confirm(
        "Regenerate your RSS token? Existing feed URLs will stop working.",
      )
    )
      return;
    setRegenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<RssAccess>(
        "/account/rss-token/regenerate",
        {
          method: "POST",
        },
      );
      access.setData(result);
      setMessage(
        "RSS token regenerated. Update your feed reader with the new URL.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not regenerate the RSS token.",
      );
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <main className="page form-page">
      <PageHeader title="RSS" />
      <section className="rss-card">
        <Rss aria-hidden="true" />
        <div>
          <h2>Your tracker feed</h2>
          <p>
            This private URL includes an access token. Add it directly to your
            feed reader and do not share it.
          </p>
        </div>
      </section>
      <ApiState
        loading={access.loading}
        error={access.error}
        empty={!access.data}
      >
        <form className="stack-form wide-form" onSubmit={submit}>
          <Field label="Optional search filter">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name or description"
            />
          </Field>
          <Field label="Private feed URL">
            <div className="copy-field">
              <input readOnly value={feedUrl} />
              <button
                className="secondary-button"
                type="button"
                onClick={copyFeed}
              >
                <Copy aria-hidden="true" /> Copy
              </button>
            </div>
          </Field>
          <ActionMessage message={message} error={error} />
          <div className="form-actions rss-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={regenerating}
              onClick={regenerateToken}
            >
              <RefreshCw aria-hidden="true" />{" "}
              {regenerating ? "Regenerating…" : "Regenerate token"}
            </button>
            <a
              className="primary-button button-link"
              href={feedUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open feed
            </a>
          </div>
        </form>
      </ApiState>
    </main>
  );
}
