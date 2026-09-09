import { ConversationPage } from "@/components/conversation-page";

export default async function Page({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  return (
    <ConversationPage conversationId={conversationId} key={conversationId} />
  );
}
