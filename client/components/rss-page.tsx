"use client";

import { Copy, Rss } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { ActionMessage, Field, PageHeader, SignInRequired } from "@/components/ui";
import { apiOrigin } from "@/lib/api";

export function RssPage() {
  const { session } = useAuth(); const [query, setQuery] = useState(""); const [message, setMessage] = useState("");
  const feedUrl = useMemo(() => `${apiOrigin()}/rss${query ? `?query=${encodeURIComponent(query)}` : ""}`, [query]);
  if (!session) return <main className="page"><SignInRequired /></main>;
  function submit(event: FormEvent) { event.preventDefault(); setMessage("Feed URL updated."); }
  return <main className="page form-page"><PageHeader title="RSS" /><section className="rss-card"><Rss aria-hidden="true" /><div><h2>Your tracker feed</h2><p>The API authenticates RSS clients with <code>username</code> and <code>password</code> cookies. Add those credentials in your feed reader.</p></div></section><form className="stack-form wide-form" onSubmit={submit}><Field label="Optional search filter"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name or description" /></Field><Field label="Feed URL"><div className="copy-field"><input readOnly value={feedUrl} /><button className="secondary-button" type="button" onClick={() => { navigator.clipboard.writeText(feedUrl); setMessage("Feed URL copied."); }}><Copy aria-hidden="true" /> Copy</button></div></Field><ActionMessage message={message} /><div className="form-actions"><a className="primary-button button-link" href={feedUrl} target="_blank" rel="noreferrer">Open feed</a></div></form></main>;
}
