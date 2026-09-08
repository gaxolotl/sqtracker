"use client";

import { apiFetch, AuthResponse, AuthSession, withRole } from "@/lib/api";
import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

type LoginFields = { username: string; password: string; totp?: string };
type RegisterFields = { username: string; email: string; password: string; invite?: string };

type AuthContextValue = {
  session: AuthSession | null;
  login: (fields: LoginFields) => Promise<AuthSession>;
  register: (fields: RegisterFields) => Promise<AuthSession>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("sq:session", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("sq:session", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem("sq-session");
}

function saveSession(session: AuthSession | null) {
  if (session) window.localStorage.setItem("sq-session", JSON.stringify(session));
  else window.localStorage.removeItem("sq-session");
  window.dispatchEvent(new Event("sq:session"));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const rawSession = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const session = useMemo(() => {
    if (!rawSession) return null;
    try { return JSON.parse(rawSession) as AuthSession; } catch { return null; }
  }, [rawSession]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    async login(fields) {
      const response = await apiFetch<AuthResponse>("/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify(fields),
      });
      const nextSession = withRole(response);
      saveSession(nextSession);
      return nextSession;
    },
    async register(fields) {
      const response = await apiFetch<AuthResponse>("/register", {
        method: "POST",
        auth: false,
        body: JSON.stringify(fields),
      });
      const nextSession = withRole(response);
      saveSession(nextSession);
      return nextSession;
    },
    logout() { saveSession(null); },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
