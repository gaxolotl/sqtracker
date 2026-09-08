import type { Metadata } from "next";
import { UploadPage } from "@/components/upload-page";
export const metadata: Metadata = { title: "Upload" };
export default function Page() { return <UploadPage />; }
