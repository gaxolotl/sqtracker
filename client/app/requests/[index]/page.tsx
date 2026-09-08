import { RequestDetail } from "@/components/request-detail";
export default async function Page({ params }: { params: Promise<{ index: string }> }) { const { index } = await params; return <RequestDetail index={index} />; }
