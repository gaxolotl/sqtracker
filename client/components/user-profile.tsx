"use client";

import Link from "next/link";
import { Ban, BarChart3, CircleUserRound, Download, ShieldCheck, Upload } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { TorrentTable } from "@/components/torrent-table";
import { ActionMessage, ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch } from "@/lib/api";
import { formatBytes, formatDate, formatDateTime } from "@/lib/format";
import type { UserProfile as UserProfileType } from "@/lib/types";

export function UserProfile({ username }: { username: string }) {
  const { session } = useAuth();
  const { data, error, loading, reload } = useApiData<UserProfileType>(
    session ? `/user/${encodeURIComponent(username)}` : null,
  );
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  if (!session) {
    return <main className="page"><SignInRequired /></main>;
  }

  async function setBanned(banned: boolean) {
    if (!data) return;
    const reason = banned ? window.prompt("Reason for banning this user:", "none") : undefined;
    if (banned && reason === null) return;
    setActionError("");
    setMessage("");
    try {
      await apiFetch(`/user/${banned ? "ban" : "unban"}/${encodeURIComponent(data.username)}`, {
        method: "POST",
        body: banned ? JSON.stringify({ reason }) : undefined,
      });
      setMessage(banned ? "User banned." : "User unbanned.");
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "Could not update the user.");
    }
  }

  const stats = data ? [
    { label: "Ratio", value: Number(data.ratio ?? 0).toFixed(2), icon: BarChart3 },
    { label: "Downloaded", value: formatBytes(data.downloaded?.bytes), icon: Download },
    { label: "Uploaded", value: formatBytes(data.uploaded?.bytes), icon: Upload },
  ] : [];

  return (
    <main className="page profile-page">
      <ApiState loading={loading} error={error} empty={!data}>
        {data ? (
          <>
            <PageHeader
              title={`${data.username}’s profile`}
              info={`User since ${formatDate(data.created)}`}
              actions={
                <>
                  {session.username === data.username ? (
                    <Link className="primary-button button-link" href="/account">My account</Link>
                  ) : null}
                  {session.role === "admin" && session.username !== data.username ? (
                    <button className={`secondary-button ${data.banned ? "" : "danger-action"}`} type="button" onClick={() => setBanned(!data.banned)}>
                      {data.banned ? <ShieldCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}
                      {data.banned ? "Unban" : "Ban user"}
                    </button>
                  ) : null}
                </>
              }
            />
            <span className="role profile-role"><CircleUserRound aria-hidden="true" /> {data.role}</span>
            <ActionMessage message={message} error={actionError} />

            {session.role === "admin" ? (
              <section className="admin-note">
                <h2>Only admins can see this</h2>
                <ul>
                  <li>{data.email ?? "No email"}</li>
                  <li>Email verified: {data.emailVerified ? "yes" : "no"}</li>
                  <li>Remaining invites: {data.remainingInvites ?? 0}</li>
                  <li>Status: {data.banned ? `banned (${data.banReason ?? "none"})` : "active"}</li>
                </ul>
              </section>
            ) : null}

            <section className="stats-grid">
              {stats.map(({ label, value, icon: Icon }) => (
                <article className="stat-card" key={label}>
                  <h2><Icon aria-hidden="true" /> {label}</h2><p>{value}</p>
                </article>
              ))}
            </section>

            <section className="content-section">
              <h2 className="section-title">Uploaded</h2>
              <TorrentTable torrents={data.torrents ?? []} />
            </section>

            <section className="content-section comments-section">
              <h2 className="section-title">Comments</h2>
              <div className="comments-list">
                {data.comments?.length ? data.comments.map((comment) => {
                  const target = comment.torrent
                    ? `/torrent/${comment.torrent.infoHash}`
                    : comment.announcement
                      ? `/announcements/${comment.announcement.slug}`
                      : comment.request
                        ? `/requests/${comment.request.index}`
                        : "/";
                  const name = comment.torrent?.name ?? comment.announcement?.title ?? comment.request?.title ?? "deleted item";
                  return (
                    <article className="comment" key={comment._id}>
                      <div className="comment-meta">
                        <p>Comment by <Link href={`/user/${data.username}`}>{data.username}</Link> on <Link href={target}>{name}</Link></p>
                        <time>{formatDateTime(comment.created)}</time>
                      </div>
                      <p className="comment-body">{comment.comment}</p>
                    </article>
                  );
                }) : <div className="state-panel">No comments yet.</div>}
              </div>
            </section>
          </>
        ) : null}
      </ApiState>
    </main>
  );
}
