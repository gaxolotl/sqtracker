"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch, canModerate } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Report } from "@/lib/types";

export function ReportDetail({ id }: { id: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useApiData<Report>(
    canModerate(session?.role) ? `/reports/${id}` : null,
  );
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!session)
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );

  async function run(action: () => Promise<unknown>, fallback: string) {
    setSaving(true);
    setActionError("");
    try {
      await action();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error ? requestError.message : fallback,
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleSolved() {
    return run(async () => {
      await apiFetch(`/reports/${id}`, {
        method: "PUT",
        body: JSON.stringify({ solved: !data?.solved }),
      });
      reload();
    }, "Could not update the report.");
  }

  function saveReason() {
    return run(async () => {
      await apiFetch(`/reports/${id}`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
      setEditing(false);
      reload();
    }, "Could not save the report.");
  }

  function removeReport() {
    if (!window.confirm("Delete this report permanently?")) return;
    return run(async () => {
      await apiFetch(`/reports/${id}`, { method: "DELETE" });
      router.push("/reports");
    }, "Could not delete the report.");
  }

  return (
    <main className="page detail-page">
      <ApiState
        loading={loading}
        error={!canModerate(session.role) ? "Staff access is required." : error}
        empty={!data}
      >
        {data ? (
          <>
            <PageHeader
              title={`Report on “${data.torrent?.name ?? "deleted torrent"}”`}
              info={`Reported ${formatDateTime(data.created)} by ${data.reportedBy?.username ?? "Unknown"}`}
              actions={
                <>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setReason(data.reason ?? "");
                      setEditing((open) => !open);
                    }}
                  >
                    <Pencil aria-hidden="true" /> {editing ? "Cancel" : "Edit"}
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={saving}
                    onClick={toggleSolved}
                  >
                    {data.solved ? "Mark as open" : "Mark as solved"}
                  </button>
                  <button
                    className="secondary-button danger-action"
                    type="button"
                    disabled={saving}
                    onClick={removeReport}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </button>
                </>
              }
            />
            <ActionMessage error={actionError} />
            <section className="detail-card">
              <h2>Torrent details</h2>
              <dl className="detail-list">
                <div>
                  <dt>Name</dt>
                  <dd>{data.torrent?.name}</dd>
                </div>
                <div>
                  <dt>Description</dt>
                  <dd>{data.torrent?.description}</dd>
                </div>
                <div>
                  <dt>Info hash</dt>
                  <dd className="mono">{data.torrent?.infoHash}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDateTime(data.torrent?.created)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {data.solved ? "Solved" : "Open"}
                    {data.solved && data.solvedAt
                      ? ` · ${formatDateTime(data.solvedAt)}`
                      : ""}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="copy-section">
              <h2>Reason for report</h2>
              {editing ? (
                <form
                  className="stack-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveReason();
                  }}
                >
                  <Field label="Reason">
                    <textarea
                      rows={5}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required
                    />
                  </Field>
                  <div className="form-actions">
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save reason"}
                    </button>
                  </div>
                </form>
              ) : (
                <p>{data.reason}</p>
              )}
            </section>
          </>
        ) : null}
      </ApiState>
    </main>
  );
}
