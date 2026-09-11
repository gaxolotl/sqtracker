"use client";

import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Eye,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Pager } from "@/components/pager";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { useTrackerConfig } from "@/hooks/use-tracker-config";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ForumThreadPage as ForumThreadPageData } from "@/lib/types";

export function ForumCategoryPage({ categoryId }: { categoryId: string }) {
  const { session } = useAuth();
  const { config } = useTrackerConfig();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const { data, error, loading } = useApiData<ForumThreadPageData>(
    session
      ? `/forum/category/${encodeURIComponent(categoryId)}/threads/page/${page}`
      : null,
  );

  if (!session) {
    return (
      <main className="page forum-page">
        <SignInRequired />
      </main>
    );
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    setActionError("");
    try {
      const thread = await apiFetch<{ _id: string }>("/forum/thread", {
        method: "POST",
        body: JSON.stringify({
          category: categoryId,
          title: values.get("title"),
          body: values.get("body"),
        }),
      });
      router.push(`/forum/thread/${thread._id}`);
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the thread.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page forum-page forum-category-page">
      <PageHeader
        title={data?.category.name ?? "Forum category"}
        actions={
          <>
            {session.role === "admin" ? (
              <Link
                className="secondary-button button-link"
                href="/forum/admin"
                aria-label="Category settings"
                title="Category settings"
              >
                <Settings aria-hidden="true" />
              </Link>
            ) : null}
            <Link className="secondary-button button-link" href="/forum">
              <ArrowLeft aria-hidden="true" /> Forum index
            </Link>
            <button
              className="primary-button button-link"
              type="button"
              onClick={() => setComposerOpen((open) => !open)}
            >
              {composerOpen ? (
                <X aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {composerOpen ? "Close" : "New topic"}
            </button>
          </>
        }
      />
      {data?.category.description ? (
        <p className="forum-category-description">
          {data.category.description}
        </p>
      ) : null}

      {composerOpen ? (
        <section className="forum-new-thread-section">
          <h2 className="section-title">Create new topic</h2>
          <form
            className="stack-form forum-thread-form"
            onSubmit={createThread}
          >
            <Field label="Title">
              <input
                name="title"
                maxLength={Math.min(config.contentLimits.title, 200)}
                required
              />
            </Field>
            <Field label="Message" hint="Markdown is supported.">
              <textarea
                name="body"
                rows={6}
                maxLength={Math.min(config.contentLimits.body, 50000)}
                required
                placeholder="Share the details of your topic"
              />
            </Field>
            <ActionMessage error={actionError} />
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Posting..." : "Post thread"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="content-section forum-thread-section">
        <div className="forum-topics">
          <div className="forum-topics-head" aria-hidden="true">
            <span />
            <span>Topic{data?.total ? ` (${data.total})` : ""}</span>
            <span>Replies</span>
            <span>Views</span>
            <span>Last activity</span>
          </div>
          <ApiState
            loading={loading}
            error={error}
            empty={!loading && !error && !data?.threads.length}
          >
            <div className="forum-thread-list">
              {data?.threads.map((thread) => {
                const lastAuthor =
                  thread.lastPost?.author?.username ?? thread.author?.username;
                const lastTime = thread.lastPost?.created ?? thread.updated;
                return (
                  <article className="forum-thread-row" key={thread._id}>
                    <div className="forum-topic-icon">
                      {thread.locked ? (
                        <Lock aria-label="Locked" />
                      ) : thread.pinned ? (
                        <Pin aria-label="Pinned" />
                      ) : (
                        <MessageSquare aria-hidden="true" />
                      )}
                    </div>
                    <div className="forum-thread-summary">
                      <h3>
                        <Link href={`/forum/thread/${thread._id}`}>
                          {thread.title}
                        </Link>
                      </h3>
                      <p>
                        Started by {thread.author?.username ?? "Unknown"} -{" "}
                        {formatDateTime(thread.created)}
                      </p>
                    </div>
                    <div className="forum-count forum-topic-count">
                      <strong>{thread.postCount}</strong>
                      <span>Replies</span>
                    </div>
                    <div className="forum-count forum-topic-count">
                      <strong>{thread.views}</strong>
                      <span>
                        <Eye aria-hidden="true" /> Views
                      </span>
                    </div>
                    <div className="forum-thread-activity">
                      <span>Last activity</span>
                      <small>
                        {lastAuthor ? `by ${lastAuthor} - ` : ""}
                        {formatDateTime(lastTime)}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
            {data ? (
              <Pager
                page={page}
                pageSize={data.pageSize}
                total={data.total}
                onPageChange={setPage}
              />
            ) : null}
          </ApiState>
        </div>
      </section>
    </main>
  );
}
