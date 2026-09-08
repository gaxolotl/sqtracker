import Link from "next/link";
import { Download, List, MessageSquare, Upload } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { Torrent } from "@/lib/types";
import { useI18n } from "@/components/i18n-context";

export type Comment = {
  id: string;
  context: string;
  date: string;
  body: string;
};

type TorrentTableProps = {
  torrents?: Torrent[];
};

function commentCount(comments: Torrent["comments"]) {
  if (Array.isArray(comments)) return comments.length;
  return comments?.count ?? 0;
}

export function TorrentTable({ torrents = [] }: TorrentTableProps) {
  const { t } = useI18n();
  return (
    <div className="table-wrap">
      <table className="torrent-table">
        <thead>
          <tr>
            <th>{t("name")}</th>
            <th>{t("category")}</th>
            <th>{t("seeders")}</th>
            <th>{t("leechers")}</th>
            <th>{t("comments")}</th>
            <th>{t("uploaded")}</th>
          </tr>
        </thead>
        <tbody>
          {torrents.map((torrent) => (
            <tr key={torrent.infoHash}>
              <td data-label={t("name")}><Link className="torrent-name" href={`/torrent/${torrent.infoHash}`}>{torrent.name}</Link></td>
              <td data-label={t("category")}><span className="cell-with-icon"><List aria-hidden="true" /> {torrent.type || t("all")}</span></td>
              <td data-label={t("seeders")}><span className="cell-with-icon"><Upload aria-hidden="true" /> {torrent.seeders ?? torrent.complete ?? "?"}</span></td>
              <td data-label={t("leechers")}><span className="cell-with-icon"><Download aria-hidden="true" /> {torrent.leechers ?? torrent.incomplete ?? "?"}</span></td>
              <td data-label={t("comments")}><span className="cell-with-icon"><MessageSquare aria-hidden="true" /> {commentCount(torrent.comments)}</span></td>
              <td data-label={t("uploaded")}><time>{formatDate(torrent.created)}</time></td>
            </tr>
          ))}
          {!torrents.length ? <tr className="empty-row"><td colSpan={6}>{t("noTorrents")}</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}
