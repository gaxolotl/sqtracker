import { HomeDashboard } from "@/components/home-dashboard";

type HomePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q = "" } = await searchParams;
  return <HomeDashboard initialQuery={q} />;
}
