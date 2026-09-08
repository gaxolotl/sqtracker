import type { Metadata } from "next";
import { StatsPage } from "@/components/stats-page";
export const metadata: Metadata = { title: "Stats" };
export default function Page() { return <StatsPage />; }
