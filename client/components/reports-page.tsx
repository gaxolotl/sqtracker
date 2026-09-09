"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { formatDateTime } from "@/lib/format";
import { canModerate } from "@/lib/api";
import type { Report } from "@/lib/types";

export function ReportsPage() {
  const { session } = useAuth();
  const { data, error, loading } = useApiData<Report[]>(
    canModerate(session?.role) ? "/reports/page/0" : null,
  );
  if (!session)
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );
  return (
    <main className="page list-page">
      <PageHeader title="Reports" />
      <ApiState
        loading={loading}
        error={!canModerate(session.role) ? "Staff access is required." : error}
        empty={!data?.length}
      >
        <div className="feed-list">
          {data?.map((report) => (
            <Link
              className="feed-card"
              href={`/reports/${report._id}`}
              key={report._id}
            >
              <div>
                <h2>
                  <TriangleAlert aria-hidden="true" />
                  {report.torrent?.name ?? "Deleted torrent"}
                </h2>
                <p>
                  Reported {formatDateTime(report.created)} by{" "}
                  <span>{report.reportedBy?.username ?? "Unknown"}</span>
                </p>
              </div>
              <span className="feed-arrow">→</span>
            </Link>
          ))}
        </div>
      </ApiState>
    </main>
  );
}
