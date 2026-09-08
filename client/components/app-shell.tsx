"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useI18n, type Locale } from "@/components/i18n-context";
import clientPackage from "@/package.json";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleUserRound,
  Download,
  Home,
  List,
  LogOut,
  LogIn,
  Languages,
  Menu,
  MessageSquarePlus,
  Moon,
  Newspaper,
  Rss,
  Search,
  Sun,
  TriangleAlert,
  UserPlus,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useTrackerConfig } from "@/hooks/use-tracker-config";

const primaryItems = [
  { label: "home", href: "/", icon: Home },
  { label: "browse", href: "/browse", icon: List },
  { label: "search", href: "/search", icon: Search },
  { label: "upload", href: "/upload", icon: Upload },
  { label: "announcements", href: "/announcements", icon: Newspaper },
  { label: "requests", href: "/requests", icon: MessageSquarePlus },
  { label: "rss", href: "/rss", icon: Rss },
  { label: "wiki", href: "/wiki", icon: BookOpen },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const { locale, setLocale, t } = useI18n();
  const { config } = useTrackerConfig();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("sq-theme");
    const dark = savedTheme ? savedTheme === "dark" : true;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("sq-theme", nextTheme);
  }

  function submitGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") ?? "").trim();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  const accountItems: Array<{ label: string; href: string; icon: LucideIcon }> = session ? [
    { label: session.username, href: `/user/${session.username}`, icon: CircleUserRound },
    ...(session.role === "admin" ? [
      { label: t("reports"), href: "/reports", icon: TriangleAlert },
      { label: t("stats"), href: "/stats", icon: BarChart3 },
    ] : []),
  ] : [
    { label: t("login"), href: "/login", icon: LogIn },
    ...(config.allowRegister === "closed"
      ? []
      : [{ label: t("register"), href: "/register", icon: UserPlus }]),
  ];
  const visiblePrimaryItems = session ? primaryItems : [];

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true"><Download /></span>
            <span>sqtracker demo</span>
          </Link>
          <button className="mobile-close" type="button" onClick={() => setMenuOpen(false)} aria-label={t("closeNavigation")}><X /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {visiblePrimaryItems.map(({ label, href, icon: Icon }) => (
            <Link
              className={`nav-link ${isActive(href) ? "active" : ""}`}
              href={href}
              key={label}
              onClick={() => setMenuOpen(false)}
            >
              <span>{t(label)}</span>
              <Icon aria-hidden="true" />
            </Link>
          ))}
          {accountItems.map(({ label, href, icon: Icon }, index) => (
            <Link
              className={`nav-link ${isActive(href) ? "active" : ""} ${index === 0 ? "nav-separator" : ""}`}
              href={href}
              key={label}
              onClick={() => setMenuOpen(false)}
            >
              <span>{label}</span>
              <Icon aria-hidden="true" />
            </Link>
          ))}
          {session ? (
            <Link className="nav-link logout-link" href="/logout" onClick={() => setMenuOpen(false)}>
              <span>{t("logout")}</span>
              <LogOut aria-hidden="true" />
            </Link>
          ) : null}
        </nav>

        <footer className="sidebar-footer">
          <p>{t("poweredBy")} <span className="mini-mark" /> <strong>sqtracker</strong></p>
          <span>v{clientPackage.version}</span>
        </footer>
      </aside>

      {menuOpen && <button className="sidebar-scrim" type="button" onClick={() => setMenuOpen(false)} aria-label={t("closeNavigation")} />}

      <div className="app-content">
        <header className="topbar">
          <button className="menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label={t("openNavigation")}><Menu /></button>
          {session ? <form className="global-search" onSubmit={submitGlobalSearch}>
            <Search aria-hidden="true" />
            <input name="query" type="search" aria-label={t("searchTracker")} placeholder={t("search")} />
          </form> : <span className="topbar-spacer" />}
          <div className="language-menu">
            <button
              className="language-trigger"
              type="button"
              title={t("language")}
              aria-label={t("language")}
              aria-expanded={languageOpen}
              onClick={() => setLanguageOpen((open) => !open)}
            >
              <Languages aria-hidden="true" />
              <span>{locale.toUpperCase()}</span>
              <ChevronDown aria-hidden="true" />
            </button>
            {languageOpen ? (
              <div className="language-options" role="menu">
                {(["en", "bg"] as Locale[]).map((option) => (
                  <button
                    className={option === locale ? "language-option active" : "language-option"}
                    key={option}
                    type="button"
                    role="menuitem"
                    onClick={() => { setLocale(option); setLanguageOpen(false); }}
                  >
                    <span>{option === "en" ? t("english") : t("bulgarian")}</span>
                    <strong>{option.toUpperCase()}</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button className="theme-button" type="button" onClick={toggleTheme} aria-label={t("toggleTheme")}>
            <Moon className="moon-icon" aria-hidden="true" />
            <Sun className="sun-icon" aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
