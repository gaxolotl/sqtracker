import { ForumSearchPage } from "@/components/forum-search-page";


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  return <ForumSearchPage initialQuery={q} key={q} />;
}
