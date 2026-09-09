import { MessageCompose } from "@/components/message-compose";


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ username?: string | string[] }>;
}) {
  const { username } = await searchParams;
  const initialRecipient = Array.isArray(username)
    ? (username[0] ?? "")
    : (username ?? "");

  return (
    <MessageCompose
      initialRecipient={initialRecipient}
      key={initialRecipient}
    />
  );
}
