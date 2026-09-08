import type { Metadata } from "next";
import { BrowsePage } from "@/components/browse-page";

export const metadata: Metadata = { title: "Browse" };
export default function Page() { return <BrowsePage />; }
