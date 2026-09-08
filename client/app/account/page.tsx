import type { Metadata } from "next";
import { AccountPage } from "@/components/account-page";
export const metadata: Metadata = { title: "My account" };
export default function Page() { return <AccountPage />; }
