import { UserProfile } from "@/components/user-profile";
export default async function Page({ params }: { params: Promise<{ username: string }> }) { const { username } = await params; return <UserProfile username={username} />; }
