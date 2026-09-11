"use client";

import {
  defineClientPlugin,
  type PluginManifest,
  type PluginPageProps,
  type PluginSlotProps,
} from "@sqtrackr/plugin-sdk/client";
import sharedManifest from "@sqtrackr/plugin-reseed-radar/manifest";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-context";
import {
  ActionMessage,
  ApiState,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch, canModerate } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

type ReseedTorrent = {
  id?: string;
  infoHash: string;
  name: string;
  seeders?: number;
  created: number;
};

type ReseedRequest = {
  id: string;
  _id?: string;
  torrent: ReseedTorrent;
  requestCount: number;
  expiresAt: number | string;
  fulfilledAt?: number | string | null;
  requestedByMe: boolean;
  seededByMe?: boolean;
};

type ReseedResponse = {
  requests: ReseedRequest[];
  page: number;
  limit: number;
  total: number;
};

type ReseedStatusResponse = {
  torrent: ReseedTorrent;
  request: ReseedRequest | null;
};

type TorrentSlotContext = {
  torrent: ReseedTorrent;
  session: { id: string; role: "user" | "staff" | "admin" } | null;
  reload?: () => void;
};

export const manifest = {
  ...sharedManifest,
  description: "Surfaces torrents that members have asked the community to reseed.",
} as const satisfies PluginManifest;

function requestList(response: ReseedResponse | null) {
  return response?.requests ?? [];
}

function requestTorrent(request: ReseedRequest): ReseedTorrent | null {
  return request.torrent;
}

function requestDemand(request: ReseedRequest) {
  return request.requestCount;
}

function requestedByMe(request: ReseedRequest) {
  return request.requestedByMe;
}

function timestamp(value: number | string | null | undefined) {
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function expiryTimestamp(request: ReseedRequest) {
  return timestamp(request.expiresAt);
}

function torrentSlotContext(context: unknown): TorrentSlotContext | null {
  if (!context || typeof context !== "object") return null;
  const value = context as Partial<TorrentSlotContext>;
  if (
    !value.torrent ||
    typeof value.torrent.infoHash !== "string" ||
    typeof value.torrent.name !== "string"
  ) {
    return null;
  }
  return value as TorrentSlotContext;
}

function Demand({ request }: { request: ReseedRequest }) {
  const demand = requestDemand(request);
  return (
    <span className="reseed-radar-demand">
      <Users aria-hidden="true" />
      {demand} {demand === 1 ? "request" : "requests"}
    </span>
  );
}

function Expiry({ request }: { request: ReseedRequest }) {
  return (
    <span className="reseed-radar-expiry">
      <Clock3 aria-hidden="true" />
      {formatDateTime(expiryTimestamp(request))}
    </span>
  );
}

function ReseedPage({ slug }: PluginPageProps) {
  const { session } = useAuth();
  const completed = slug[0] === "completed";
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const requests = useApiData<ReseedResponse>(
    session
      ? `/plugins/reseed-radar/${completed ? "completed" : "requests"}${
          debounced ? `?q=${encodeURIComponent(debounced)}` : ""
        }`
      : null,
  );
  const list = requestList(requests.data);

  async function removeCompleted(request: ReseedRequest) {
    if (!window.confirm("Delete this completed request?")) return;
    setDeletingId(request.id);
    setActionError("");
    try {
      await apiFetch(
        `/plugins/reseed-radar/completed/${encodeURIComponent(request.id)}`,
        { method: "DELETE" },
      );
      requests.reload();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete the completed request.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!session) {
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );
  }

  return (
    <main className="page reseed-radar-page">
      <PageHeader
        title="Reseed"
        info={
          completed
            ? "Torrents that were seeded again after a community request."
            : "Open reseed requests expire automatically when their response window closes."
        }
      />
      <div className="reseed-tabs" role="tablist" aria-label="Reseed requests">
        <Link role="tab" aria-selected={!completed} href="/plugins/reseed-radar">
          Open
        </Link>
        <Link
          role="tab"
          aria-selected={completed}
          href="/plugins/reseed-radar/completed"
        >
          Completed
        </Link>
      </div>
      <div className="reseed-radar-search">
        <Search aria-hidden="true" />
        <input
          type="search"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={
            completed
              ? "Search completed requests by torrent name"
              : "Search reseed requests by torrent name"
          }
          aria-label="Search reseed requests"
        />
      </div>
      <ActionMessage error={actionError} />
      <ApiState
        loading={requests.loading}
        error={requests.error}
        empty={!requests.loading && !list.length}
      >
        <div className="reseed-radar-list">
          {list.map((request) => {
            const torrent = requestTorrent(request);
            if (!torrent) return null;
            if (completed) {
              return (
                <article
                  className={`reseed-radar-request${
                    request.requestedByMe ? " reseed-radar-request-seeded" : ""
                  }`}
                  key={request.id}
                >
                  <div className="reseed-radar-request-main">
                    <span className="reseed-radar-signal" aria-hidden="true">
                      <CheckCircle2 />
                    </span>
                    <div>
                      <Link href={`/torrent/${torrent.infoHash}`}>
                        {torrent.name}
                      </Link>
                      <div className="reseed-radar-meta">
                        <span className="reseed-radar-completed">
                          <CheckCircle2 aria-hidden="true" /> Reseeded
                        </span>
                        <span className="reseed-radar-expiry">
                          <Clock3 aria-hidden="true" />
                          {formatDateTime(timestamp(request.fulfilledAt))}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="reseed-radar-request-actions">
                    {request.requestedByMe ? (
                      <span className="reseed-radar-seeded">Your request</span>
                    ) : null}
                    {canModerate(session.role) ? (
                      <button
                        className="secondary-button compact-button danger-action"
                        type="button"
                        disabled={deletingId === request.id}
                        onClick={() => removeCompleted(request)}
                      >
                        <Trash2 aria-hidden="true" />
                        {deletingId === request.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            }
            return (
              <article
                className={`reseed-radar-request${
                  request.seededByMe ? " reseed-radar-request-seeded" : ""
                }`}
                key={request.id}
              >
                <div className="reseed-radar-request-main">
                  <span className="reseed-radar-signal" aria-hidden="true">
                    <RefreshCw />
                  </span>
                  <div>
                    <Link href={`/torrent/${torrent.infoHash}`}>
                      {torrent.name}
                    </Link>
                    <div className="reseed-radar-meta">
                      <Demand request={request} />
                      <Expiry request={request} />
                    </div>
                  </div>
                </div>
                {request.seededByMe ? (
                  <span className="reseed-radar-seeded">You seeded this</span>
                ) : !requestedByMe(request) ? (
                  <span className="reseed-radar-help">You can help</span>
                ) : null}
              </article>
            );
          })}
        </div>
      </ApiState>
    </main>
  );
}

function ReseedAction({ context }: PluginSlotProps) {
  const slot = torrentSlotContext(context);
  const status = useApiData<ReseedStatusResponse>(
    slot?.session
      ? `/plugins/reseed-radar/status/${encodeURIComponent(slot.torrent.infoHash)}`
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!slot?.session) return null;
  const request = status.data?.request;
  const cancelling = Boolean(request && requestedByMe(request));

  async function updateRequest() {
    if (!slot) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiFetch(
        `/plugins/reseed-radar/requests/${encodeURIComponent(slot.torrent.infoHash)}`,
        {
          method: cancelling ? "DELETE" : "POST",
        },
      );
      setMessage(
        cancelling ? "Reseed request cancelled." : "Reseed requested.",
      );
      status.reload();
      slot.reload?.();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the reseed request.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        className={`icon-action reseed-radar-action${cancelling ? " danger-action" : ""}`}
        type="button"
        disabled={saving || status.loading || Boolean(status.error)}
        onClick={updateRequest}
      >
        {cancelling ? (
          <X aria-hidden="true" />
        ) : (
          <RefreshCw aria-hidden="true" />
        )}
        {saving
          ? "Updating..."
          : cancelling
            ? "Cancel reseed"
            : "Request reseed"}
      </button>
      <ActionMessage message={message} error={error || status.error} />
    </>
  );
}

function ReseedStatus({ context }: PluginSlotProps) {
  const slot = torrentSlotContext(context);
  const status = useApiData<ReseedStatusResponse>(
    slot?.session
      ? `/plugins/reseed-radar/status/${encodeURIComponent(slot.torrent.infoHash)}`
      : null,
  );
  if (!slot?.session) return null;
  const request = status.data?.request;

  if (status.loading || status.error) {
    return (
      <div className="reseed-radar-status-state">
        <ApiState loading={status.loading} error={status.error}>
          {null}
        </ApiState>
      </div>
    );
  }
  if (!request) return null;

  return (
    <section className="detail-card reseed-radar-status">
      <div className="reseed-radar-status-heading">
        <div>
          <span>Reseed</span>
          <h2>Community reseed requested</h2>
        </div>
        {!requestedByMe(request) ? (
          <span className="reseed-radar-help">You can help</span>
        ) : null}
      </div>
      <div className="reseed-radar-meta">
        <Demand request={request} />
        <Expiry request={request} />
        {requestedByMe(request) ? <span>Your request is active</span> : null}
      </div>
    </section>
  );
}

function SeederNotice() {
  const { session } = useAuth();
  const helping = useApiData<ReseedResponse>(
    session ? "/plugins/reseed-radar/helping" : null,
  );
  const list = requestList(helping.data);
  if (!session || !list.length) return null;

  const names = list
    .map((request) => requestTorrent(request)?.name)
    .filter((name): name is string => Boolean(name));
  const first = names[0] ?? "a torrent";

  return (
    <aside className="reseed-radar-notice" role="status">
      <span className="reseed-radar-notice-icon" aria-hidden="true">
        <RefreshCw />
      </span>
      <div className="reseed-radar-notice-copy">
        <strong>
          {list.length === 1
            ? "You can help keep a torrent alive"
            : `You can help keep ${list.length} torrents alive`}
        </strong>
        <p>
          You have seeded {first}
          {list.length > 1 ? ` and ${list.length - 1} more` : ""} before. Add a
          reseed request so others can download it again.
        </p>
      </div>
      <Link
        className="secondary-button button-link reseed-radar-notice-action"
        href="/plugins/reseed-radar"
      >
        Open Reseed
      </Link>
    </aside>
  );
}

function FulfilledNotice() {
  const { session } = useAuth();
  const fulfilled = useApiData<ReseedResponse>(
    session ? "/plugins/reseed-radar/fulfilled" : null,
  );
  const list = requestList(fulfilled.data);
  if (!session || !list.length) return null;

  const names = list
    .map((request) => requestTorrent(request)?.name)
    .filter((name): name is string => Boolean(name));
  const first = names[0] ?? "your torrent";

  return (
    <aside
      className="reseed-radar-notice reseed-radar-notice-fulfilled"
      role="status"
    >
      <span className="reseed-radar-notice-icon" aria-hidden="true">
        <RefreshCw />
      </span>
      <div className="reseed-radar-notice-copy">
        <strong>
          {list.length === 1
            ? "Your reseed request worked"
            : `${list.length} of your reseed requests worked`}
        </strong>
        <p>
          {first}
          {list.length > 1 ? ` and ${list.length - 1} more` : ""} started
          seeding again. Thanks for helping keep it alive.
        </p>
      </div>
      <Link
        className="secondary-button button-link reseed-radar-notice-action"
        href="/plugins/reseed-radar/completed"
      >
        View completed
      </Link>
    </aside>
  );
}

function HighDemandWidget() {
  const { session } = useAuth();
  const requests = useApiData<ReseedResponse>(
    session ? "/plugins/reseed-radar/requests?limit=50" : null,
  );
  if (!session) return null;
  const highDemand = [...requestList(requests.data)]
    .sort((left, right) => requestDemand(right) - requestDemand(left))
    .slice(0, 5);

  return (
    <section className="content-section reseed-radar-widget">
      <div className="section-heading-row reseed-radar-widget-heading">
        <h2 className="section-title">Reseed</h2>
        <Link href="/plugins/reseed-radar">View all</Link>
      </div>
      <ApiState
        loading={requests.loading}
        error={requests.error}
        empty={!requests.loading && !highDemand.length}
      >
        <div className="reseed-radar-widget-list">
          {highDemand.map((request) => {
            const torrent = requestTorrent(request);
            if (!torrent) return null;
            return (
              <Link
                href={`/torrent/${torrent.infoHash}`}
                key={request.id}
              >
                <span>{torrent.name}</span>
                <strong>{requestDemand(request)}</strong>
              </Link>
            );
          })}
        </div>
      </ApiState>
    </section>
  );
}

export const navigation = [
  {
    label: "Reseed",
    href: "/plugins/reseed-radar",
    icon: RefreshCw,
    authenticated: true,
  },
] as const;

export const pages = [
  {
    path: "/",
    title: "Reseed",
    component: ReseedPage,
  },
  {
    path: "/completed",
    title: "Reseed",
    component: ReseedPage,
  },
] as const;

export const slots = [
  {
    name: "home.afterHeader",
    component: SeederNotice,
    authenticated: true,
  },
  {
    name: "home.afterHeader",
    component: FulfilledNotice,
    authenticated: true,
  },
  {
    name: "torrent.actions",
    component: ReseedAction,
    authenticated: true,
  },
  {
    name: "torrent.afterDetails",
    component: ReseedStatus,
    authenticated: true,
  },
  {
    name: "home.afterContent",
    component: HighDemandWidget,
    authenticated: true,
  },
] as const;

export default defineClientPlugin({ manifest, navigation, pages, slots });
