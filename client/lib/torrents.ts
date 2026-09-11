import type { Torrent } from "@/lib/types";

export function torrentDisplayName(torrent: Torrent, shorten = true) {
  return shorten ? torrent.tmdb?.title?.trim() || torrent.name : torrent.name;
}

export function torrentReleaseDetail(torrent: Torrent) {
  const metadata = torrent.tmdb;
  if (metadata?.mediaType !== "tv" || metadata.season === undefined) return "";

  const details = [`Season ${metadata.season}`];
  if (metadata.episodes?.length) {
    details.push(
      `${metadata.episodes.length === 1 ? "Episode" : "Episodes"} ${metadata.episodes.join(", ")}`,
    );
  }
  if (metadata.episodeTitle) details.push(metadata.episodeTitle);
  return details.join(" · ");
}
