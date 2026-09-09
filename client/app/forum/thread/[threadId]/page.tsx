import { ForumThreadPage } from "@/components/forum-thread-page";

export default async function Page({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <ForumThreadPage threadId={threadId} />;
}
