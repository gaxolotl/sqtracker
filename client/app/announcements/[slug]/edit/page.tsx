import { AnnouncementEditor } from "@/components/announcement-editor";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AnnouncementEditor slug={slug} />;
}
