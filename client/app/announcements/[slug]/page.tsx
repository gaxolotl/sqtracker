import { AnnouncementDetail } from "@/components/announcement-detail";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <AnnouncementDetail slug={slug} />; }
