"use client";

import Link from "next/link";
import { CheckCircle2, CircleDashed, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { formatDateTime } from "@/lib/format";
import type { TrackerRequest } from "@/lib/types";

export function RequestsPage() {
  const { session } = useAuth();
  const { data, error, loading } = useApiData<TrackerRequest[]>(session ? "/requests/page/0" : null);
  if (!session) return <main className="page"><SignInRequired /></main>;
  return <main className="page list-page"><PageHeader title="Requests" actions={<Link className="primary-button button-link" href="/requests/new"><Plus aria-hidden="true" /> New request</Link>} /><ApiState loading={loading} error={error} empty={!data?.length}><div className="feed-list">{data?.map((item) => <Link className="feed-card" href={`/requests/${item.index}`} key={item._id}><div><h2>{item.fulfilledBy ? <CheckCircle2 className="success-icon" /> : <CircleDashed />}{item.title}</h2><p>Posted {formatDateTime(item.created)} by <span>{item.createdBy?.username ?? "Unknown"}</span></p></div><span className="status-pill">{item.fulfilledBy ? "Filled" : "Open"}</span></Link>)}</div></ApiState></main>;
}
