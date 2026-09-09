import { ForumCategoryPage } from "@/components/forum-category-page";

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  return <ForumCategoryPage categoryId={categoryId} />;
}
