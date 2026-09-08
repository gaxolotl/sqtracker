import { TagPage } from "@/components/tag-page";

export default async function Page({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  return <TagPage tag={tag} />;
}
