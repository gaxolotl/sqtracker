"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch, canModerate } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Report } from "@/lib/types";

export function ReportDetail({ id }: { id: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const { data, error, loading } = useApiData<Report>(
    canModerate(session?.role) ? `/reports/${id}` : null,
  );
  if (!session)
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );
  async function resolve() {
    await apiFetch(`/reports/resolve/${id}`, { method: "POST" });
    router.push("/reports");
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
                <button
                  className="primary-button"
                  type="button"
                  onClick={resolve}
                >
                  Mark as solved
                </button>
              }
            />
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
              </dl>
            </section>
            <section className="copy-section">
              <h2>Reason for report</h2>
              <p>{data.reason}</p>
            </section>
          </>
        ) : null}
      </ApiState>
    </main>
  );
}
