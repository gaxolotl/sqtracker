import { WikiPage } from "@/components/wiki-page";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  return <WikiPage slug={slug?.length ? `/${slug.join("/")}` : "/"} />;
}
