import { WikiEditor } from "@/components/wiki-editor";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  return <WikiEditor slug={slug ? decodeURIComponent(slug) : null} />;
}
