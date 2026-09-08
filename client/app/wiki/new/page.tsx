import { WikiEditor } from "@/components/wiki-editor";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; main?: string }>;
}) {
  const { slug, main } = await searchParams;
  return (
    <WikiEditor
      slug={slug ? decodeURIComponent(slug) : null}
      defaultSlug={main === "1" ? "/" : undefined}
    />
  );
}
