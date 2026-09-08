"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch } from "@/lib/api";
import { Markdown } from "@/lib/markdown";
import type { WikiResponse } from "@/lib/types";

export function WikiPage({ slug = "/" }: { slug?: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const { data, error, loading } = useApiData<WikiResponse>(session ? `/wiki${slug}` : null);

  if (!session) return <main className="page"><SignInRequired /></main>;

  async function removePage() {
    if (!data?.page || !window.confirm("Delete this wiki page permanently?")) return;
    try {
      await apiFetch(`/wiki${data.page.slug}`, { method: "DELETE" });
      router.push("/wiki");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not delete the wiki page.");
    }
  }

  return (
    <main className="page wiki-page">
      <ApiState loading={loading} error={error || actionError} empty={!data?.page}>
        {data ? (
          <div className="wiki-layout">
            <div className="wiki-main">
              <PageHeader
                title={data.page.title}
                actions={session.role === "admin" ? (
                  <>
                    <Link className="secondary-button button-link" href={`/wiki/new?slug=${encodeURIComponent(data.page.slug)}`}>
                      <Pencil aria-hidden="true" /> Edit
                    </Link>
                    <button className="secondary-button danger-action" type="button" onClick={removePage}>
                      <Trash2 aria-hidden="true" /> Delete
                    </button>
                  </>
                ) : null}
              />
              <article className="wiki-content">
                <Markdown text={data.page.body ?? ""} />
              </article>
            </div>
            <aside className="wiki-nav">
              <div className="wiki-nav-heading">
                <h2>Wiki pages</h2>
                {session.role === "admin" ? (
                  <Link className="primary-button compact-button button-link" href="/wiki/new" title="New wiki page">
                    <Plus aria-hidden="true" /> New
                  </Link>
                ) : null}
              </div>
              <ul>
                {data.allPages.map((page) => (
                  <li key={page.slug}>
                    <Link className={page.slug === data.page.slug ? "wiki-nav-link active" : "wiki-nav-link"} href={`/wiki${page.slug}`}>
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        ) : null}
      </ApiState>
    </main>
  );
}
