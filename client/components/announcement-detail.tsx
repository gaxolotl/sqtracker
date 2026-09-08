"use client";

import Link from "next/link";
import { Pencil, Pin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { CommentThread } from "@/components/comment-thread";
import { ActionMessage, ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Announcement } from "@/lib/types";

export function AnnouncementDetail({ slug }: { slug: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<Announcement>(
    session ? `/announcements/${encodeURIComponent(slug)}` : null,
  );
  const [actionError, setActionError] = useState("");

  if (!session) {
    return <main className="page"><SignInRequired /></main>;
  }

  async function togglePin() {
    if (!data) return;
    setActionError("");
    try {
      await apiFetch(`/announcements/pin/${data._id}/${data.pinned ? "unpin" : "pin"}`, { method: "POST" });
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not update the announcement.");
    }
  }

  async function removeAnnouncement() {
    if (!data || !window.confirm("Delete this announcement permanently?")) return;
    setActionError("");
    try {
      await apiFetch(`/announcements/${encodeURIComponent(data.slug)}`, { method: "DELETE" });
      router.push("/announcements");
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not delete the announcement.");
    }
  }

  return (
    <main className="page detail-page">
      <ApiState loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <PageHeader
              title={data.title}
              info={`Posted ${formatDateTime(data.created)} by ${data.createdBy?.username ?? "Unknown"}`}
              actions={session.role === "admin" ? (
                <>
                  <Link className="secondary-button button-link" href={`/announcements/${data.slug}/edit`}>
                    <Pencil aria-hidden="true" /> Edit
                  </Link>
                  <button className="secondary-button" type="button" onClick={togglePin}>
                    <Pin aria-hidden="true" /> {data.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button className="secondary-button danger-action" type="button" onClick={removeAnnouncement}>
                    <Trash2 aria-hidden="true" /> Delete
                  </button>
                </>
              ) : null}
            />
            <ActionMessage error={actionError} />
            <article className="prose-card"><p>{data.body}</p></article>
            <CommentThread
              comments={data.comments}
              endpoint={`/announcements/comment/${data._id}`}
              disabled={!data.allowComments}
              onPosted={reload}
            />
          </>
        ) : null}
      </ApiState>
    </main>
  );
}
