import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-context";
import { I18nProvider } from "@/components/i18n-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "sqtracker demo",
    template: "%s · sqtracker",
  },
  description: "A focused, private torrent tracker.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <I18nProvider>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
