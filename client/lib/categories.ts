export type CategoryOption = {
  name: string;
  slug: string;
  sources: string[];
};

export function slugifyCategory(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sourceOptions(sources: string[]): string[] {
  return sources.map((source) => slugifyCategory(source));
}

export function configCategoryOptions(
  categories: Record<string, string[]> | undefined,
  fallback: CategoryOption[],
): CategoryOption[] {
  if (!categories) return fallback;
  const entries = Object.entries(categories);
  if (!entries.length) return fallback;
  return entries.map(([name, sources]) => ({
    name,
    slug: slugifyCategory(name),
    sources: sourceOptions(sources),
  }));
}
