"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  Download,
  FileText,
  Flag,
  Magnet,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-context";
import { CommentThread } from "@/components/comment-thread";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch, apiOrigin } from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { Torrent } from "@/lib/types";

function countVotes(votes: Torrent["upvotes"]) {
  return Array.isArray(votes) ? votes.length : (votes ?? 0);
}

export function TorrentDetail({ infoHash }: { infoHash: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<Torrent>(
    session ? `/torrent/info/${infoHash}` : null,
  );
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  if (!session) {
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );
  }

  async function act(path: string, success: string, body?: object) {
    setActionError("");
    setMessage("");
    try {
      await apiFetch(path, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      setMessage(success);
      reload();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error ? requestError.message : "Action failed.",
      );
    }
  }

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await act(`/torrent/report/${infoHash}`, "Report sent to the staff team.", {
      reason: values.get("reason"),
    });
    form.reset();
  }

  async function removeTorrent() {
    if (!window.confirm("Delete this torrent permanently?")) return;
    setActionError("");
    try {
      await apiFetch(`/torrent/delete/${infoHash}`, { method: "DELETE" });
      router.push("/");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the torrent.",
      );
    }
  }

  const canManage =
    data &&
    (session.role === "admin" || data.uploadedBy?._id === session.id);

  return (
    <main className="page detail-page">
      <ApiState loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <PageHeader
              title={data.name}
              info={`${data.type || "All"} · ${formatBytes(data.size)}`}
              actions={
                <>
                  <a
                    className="primary-button button-link"
                    href={`${apiOrigin()}/torrent/download/${data.infoHash}/${session.uid}`}
                  >
                    <Download aria-hidden="true" /> .torrent
                  </a>
                  <a
                    className="secondary-button button-link"
                    href={`magnet:?xt=urn:btih:${data.infoHash}&dn=${encodeURIComponent(data.name)}`}
                  >
                    <Magnet aria-hidden="true" /> Magnet
                  </a>
                </>
              }
            />

            <section className="detail-card">
              <dl className="detail-list">
                <div>
                  <dt>Uploaded by</dt>
                  <dd>
                    {data.anonymous ? (
                      "Anonymous"
                    ) : (
                      <Link href={`/user/${data.uploadedBy?.username ?? "unknown"}`}>
                        {data.uploadedBy?.username ?? "Unknown"}
                      </Link>
                    )}
                  </dd>
                </div>
                <div><dt>Date</dt><dd>{formatDateTime(data.created)}</dd></div>
                <div><dt>Info hash</dt><dd className="mono">{data.infoHash}</dd></div>
                <div><dt>Downloads</dt><dd>{data.downloads ?? 0}</dd></div>
                <div><dt>Seeders</dt><dd>{data.seeders ?? data.complete ?? "?"}</dd></div>
                <div><dt>Leechers</dt><dd>{data.leechers ?? data.incomplete ?? "?"}</dd></div>
                <div><dt>Freeleech</dt><dd>{data.freeleech ? "Yes" : "No"}</dd></div>
              </dl>
            </section>

            <section className="copy-section">
              <h2>Description</h2>
              <p>{data.description}</p>
              {data.tags?.length ? (
                <div className="tag-row">
                  {data.tags.map((tag) => (
                    <Link className="tag" href={`/tags/${encodeURIComponent(tag)}`} key={tag}>
                      {tag}
                    </Link>
                  ))}
                </div>
              ) : null}
            </section>

            {data.files?.length ? (
              <section className="detail-card files-card">
                <h2>Files</h2>
                {data.files.map((file, index) => (
                  <div className="file-row" key={`${file.path ?? file.name}-${index}`}>
                    <FileText aria-hidden="true" />
                    <span>{file.path ?? file.name ?? "File"}</span>
                    <small>{formatBytes(file.size ?? file.length)}</small>
                  </div>
                ))}
              </section>
            ) : null}

            <div className="torrent-actions">
              <button className="icon-action" type="button" onClick={() => act(`/torrent/vote/${data.infoHash}/up`, "Vote saved.")}>
                <ThumbsUp aria-hidden="true" /> {countVotes(data.upvotes)}
              </button>
              <button className="icon-action" type="button" onClick={() => act(`/torrent/vote/${data.infoHash}/down`, "Vote saved.")}>
                <ThumbsDown aria-hidden="true" /> {countVotes(data.downvotes)}
              </button>
              <button className="icon-action" type="button" onClick={() => act(`/torrent/bookmark/${data.infoHash}`, "Bookmark updated.")}>
                <Bookmark aria-hidden="true" /> {data.fetchedBy?.bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              {session.role === "admin" ? (
                <button className="icon-action" type="button" onClick={() => act(`/torrent/toggle-freeleech/${data.infoHash}`, "Freeleech updated.")}>
                  <Sparkles aria-hidden="true" /> {data.freeleech ? "Remove freeleech" : "Set freeleech"}
                </button>
              ) : null}
              {canManage ? (
                <button className="icon-action danger-action" type="button" onClick={removeTorrent}>
                  <Trash2 aria-hidden="true" /> Delete
                </button>
              ) : null}
            </div>
            <ActionMessage message={message} error={actionError} />

            <form className="inline-form report-form" onSubmit={report}>
              <Field label="Report this torrent">
                <input name="reason" required placeholder="Tell the staff team what is wrong" />
              </Field>
              <button className="secondary-button" type="submit"><Flag aria-hidden="true" /> Report</button>
            </form>

            <CommentThread
              comments={Array.isArray(data.comments) ? data.comments : []}
              endpoint={`/torrent/comment/${data.infoHash}`}
              onPosted={reload}
            />
          </>
        ) : null}
      </ApiState>
    </main>
  );
}
