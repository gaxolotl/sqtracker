import { PluginRoute } from "@/components/plugin-host";

export default async function Page({
  params,
}: {
  params: Promise<{ pluginId: string; slug?: string[] }>;
}) {
  const { pluginId, slug = [] } = await params;
  return <PluginRoute pluginId={pluginId} slug={slug} />;
}
