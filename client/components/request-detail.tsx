"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { CommentThread } from "@/components/comment-thread";
import { TorrentTable } from "@/components/torrent-table";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { TrackerRequest } from "@/lib/types";

export function RequestDetail({ index }: { index: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<TrackerRequest>(
    session ? `/requests/${index}` : null,
  );
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  if (!session) {
    return (
      <main className="page"><SignInRequired /></main>
    );
  }

  async function suggest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = new FormData(form);
    setActionError("");
    setMessage("");
    try {
      await apiFetch(`/requests/suggest/${data?._id}`, {
        method: "POST",
        body: JSON.stringify({ infoHash: payload.get("infoHash") }),
      });
      form.reset();
      setMessage("Torrent suggested.");
      reload();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not suggest torrent.",
      );
    }
  }

  async function accept(infoHash: string) {
    if (!data) return;
    setActionError("");
    setMessage("");
    try {
      await apiFetch(`/requests/accept/${data._id}`, {
        method: "POST",
        body: JSON.stringify({ infoHash }),
      });
      setMessage("Suggestion accepted. The request is now fulfilled.");
      reload();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not accept the suggestion.",
      );
    }
  }

  async function removeRequest() {
    if (!data || !window.confirm("Delete this request permanently?")) return;
    setActionError("");
    try {
      await apiFetch(`/requests/${data.index}`, { method: "DELETE" });
      router.push("/requests");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the request.",
      );
    }
  }

  const ownsRequest = data?.createdBy?._id === session.id;

  return (
    <main className="page detail-page">
      <ApiState loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <PageHeader
              title={data.title}
              info={`Posted ${formatDateTime(data.created)} by ${data.createdBy?.username ?? "Unknown"}`}
              actions={ownsRequest ? (
                <button className="secondary-button danger-action" type="button" onClick={removeRequest}>
                  <Trash2 aria-hidden="true" /> Delete
                </button>
              ) : null}
            />
            <article className="prose-card"><p>{data.body}</p></article>

            <section className="content-section">
              <div className="section-heading-row">
                <h2 className="section-title">Suggested torrents</h2>
              </div>
              <TorrentTable torrents={data.candidates ?? []} />
              {ownsRequest && data.candidates?.length ? (
                <div className="candidate-actions">
                  {data.candidates.map((torrent) => (
                    <button
                      className="secondary-button"
                      key={torrent.infoHash}
                      type="button"
                      onClick={() => accept(torrent.infoHash)}
                    >
                      <Check aria-hidden="true" /> Accept {torrent.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <form className="inline-form" onSubmit={suggest}>
                <Field label="Suggest by info hash">
                  <input name="infoHash" required placeholder="40-character torrent info hash" />
                </Field>
                <button className="primary-button" type="submit">Suggest</button>
              </form>
              <ActionMessage message={message} error={actionError} />
            </section>

            <CommentThread
              comments={data.comments}
              endpoint={`/requests/comment/${data._id}`}
              onPosted={reload}
            />
          </>
        ) : null}
      </ApiState>
    </main>
  );
}
