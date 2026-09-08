"use client";

import { Activity, CheckCircle2, Download, HardDriveUpload, MessageSquare, Radio, Send, Users } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { ApiState, PageHeader, SignInRequired } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import type { TrackerStats } from "@/lib/types";

export function StatsPage() {
  const { session } = useAuth();
  const { data, error, loading } = useApiData<TrackerStats>(session?.role === "admin" ? "/admin/stats" : null);
  if (!session) return <main className="page"><SignInRequired /></main>;
  const cards = data ? [
    { label: "Registered users", value: data.registeredUsers, icon: Users },
    { label: "Uploaded torrents", value: data.uploadedTorrents, icon: HardDriveUpload },
    { label: "Completed downloads", value: data.completedDownloads, icon: Download },
    { label: "Active torrents", value: data.activeTorrents, icon: Activity },
    { label: "Peers online", value: data.peers, icon: Radio },
    { label: "Invites accepted", value: `${data.invitesAccepted}/${data.totalInvitesSent}`, icon: Send },
    { label: "Requests filled", value: `${data.filledRequests}/${data.totalRequests}`, icon: CheckCircle2 },
    { label: "Comments", value: data.totalComments, icon: MessageSquare },
  ] : [];
  return <main className="page"><PageHeader title="Stats" /><ApiState loading={loading} error={session.role !== "admin" ? "Administrator access is required." : error} empty={!data}><section className="metric-grid">{cards.map(({ label, value, icon: Icon }) => <article className="metric-card" key={label}><Icon aria-hidden="true" /><div><strong>{value}</strong><span>{label}</span></div></article>)}</section></ApiState></main>;
}
