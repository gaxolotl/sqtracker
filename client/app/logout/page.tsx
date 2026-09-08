"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-context";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  return <main className="page"><div className="state-panel">Logging out…</div></main>;
}
