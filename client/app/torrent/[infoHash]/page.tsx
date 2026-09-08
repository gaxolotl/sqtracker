import { TorrentDetail } from "@/components/torrent-detail";
export default async function Page({ params }: { params: Promise<{ infoHash: string }> }) { const { infoHash } = await params; return <TorrentDetail infoHash={infoHash} />; }
