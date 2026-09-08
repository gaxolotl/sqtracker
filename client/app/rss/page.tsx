import type { Metadata } from "next";
import { RssPage } from "@/components/rss-page";
export const metadata: Metadata = { title: "RSS" };
export default function Page() { return <RssPage />; }
