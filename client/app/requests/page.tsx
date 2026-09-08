import type { Metadata } from "next";
import { RequestsPage } from "@/components/requests-page";
export const metadata: Metadata = { title: "Requests" };
export default function Page() { return <RequestsPage />; }
