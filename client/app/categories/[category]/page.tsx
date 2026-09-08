import { CategoryPage } from "@/components/category-page";

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <CategoryPage category={category} />;
}
