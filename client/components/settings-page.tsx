"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-context";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { refreshTrackerConfig } from "@/hooks/use-tracker-config";
import { apiFetch } from "@/lib/api";

type AdminSettings = {
  SQ_SITE_NAME: string;
  SQ_SITE_DESCRIPTION: string;
  SQ_SHOW_PAGE_IN_TITLE: boolean;
  SQ_ALLOW_REGISTER: "open" | "invite" | "closed";
  SQ_ALLOW_ANONYMOUS_UPLOADS: boolean;
  SQ_MINIMUM_RATIO: number;
  SQ_MAXIMUM_HIT_N_RUNS: number;
  SQ_TORRENT_CATEGORIES: Record<string, string[]>;
  SQ_BP_EARNED_PER_GB: number;
  SQ_BP_EARNED_PER_FILLED_REQUEST: number;
  SQ_BP_COST_PER_INVITE: number;
  SQ_BP_COST_PER_GB: number;
  SQ_SITE_WIDE_FREELEECH: boolean;
  SQ_ALLOW_UNREGISTERED_VIEW: boolean;
  SQ_EXTENSION_BLACKLIST: string[];
  SQ_SITE_DEFAULT_LOCALE: string;
  SQ_CUSTOM_THEME: Record<string, string>;
  SQ_AVATAR_MAX_RESOLUTION: number;
  SQ_AVATAR_MAX_SIZE_KB: number;
  SQ_ALLOW_GIF_AVATARS: boolean;
};

const numberFields = [
  "SQ_MINIMUM_RATIO",
  "SQ_MAXIMUM_HIT_N_RUNS",
  "SQ_BP_EARNED_PER_GB",
  "SQ_BP_EARNED_PER_FILLED_REQUEST",
  "SQ_BP_COST_PER_INVITE",
  "SQ_BP_COST_PER_GB",
  "SQ_AVATAR_MAX_RESOLUTION",
  "SQ_AVATAR_MAX_SIZE_KB",
] as const;

export function SettingsPage() {
  const { session } = useAuth();
  const settings = useApiData<AdminSettings>(
    session?.role === "admin" ? "/admin/settings" : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!session)
    return (
      <main className="page">
        <SignInRequired />
      </main>
    );
  if (session.role !== "admin")
    return (
      <main className="page">
        <div className="state-panel error">
          Only admins can access site settings.
        </div>
      </main>
    );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings.data) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const categories = JSON.parse(String(form.get("SQ_TORRENT_CATEGORIES")));
      const customTheme = Object.fromEntries(
        ["primary", "background", "sidebar", "border", "text", "grey"]
          .map((key) => [key, String(form.get(`theme_${key}`) ?? "").trim()])
          .filter(([, value]) => value),
      );
      const next: AdminSettings = {
        ...settings.data,
        SQ_SITE_NAME: String(form.get("SQ_SITE_NAME")),
        SQ_SITE_DESCRIPTION: String(form.get("SQ_SITE_DESCRIPTION")),
        SQ_ALLOW_REGISTER: String(
          form.get("SQ_ALLOW_REGISTER"),
        ) as AdminSettings["SQ_ALLOW_REGISTER"],
        SQ_SITE_DEFAULT_LOCALE: String(form.get("SQ_SITE_DEFAULT_LOCALE")),
        SQ_TORRENT_CATEGORIES: categories,
        SQ_EXTENSION_BLACKLIST: String(form.get("SQ_EXTENSION_BLACKLIST"))
          .split(",")
          .map((value) => value.trim().replace(/^\./, ""))
          .filter(Boolean),
        SQ_CUSTOM_THEME: customTheme,
        SQ_ALLOW_ANONYMOUS_UPLOADS: form.has("SQ_ALLOW_ANONYMOUS_UPLOADS"),
        SQ_SHOW_PAGE_IN_TITLE: form.has("SQ_SHOW_PAGE_IN_TITLE"),
        SQ_SITE_WIDE_FREELEECH: form.has("SQ_SITE_WIDE_FREELEECH"),
        SQ_ALLOW_UNREGISTERED_VIEW: form.has("SQ_ALLOW_UNREGISTERED_VIEW"),
        SQ_ALLOW_GIF_AVATARS: form.has("SQ_ALLOW_GIF_AVATARS"),
      };
      for (const key of numberFields) next[key] = Number(form.get(key));
      await apiFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(next),
      });
      refreshTrackerConfig();
      settings.reload();
      setMessage("Site settings saved and applied.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page settings-page">
      <PageHeader
        title="Site settings"
        info="Runtime-safe changes apply immediately and persist in the database."
      />
      <ActionMessage message={message} error={error} />
      <ApiState
        loading={settings.loading}
        error={settings.error}
        empty={!settings.data}
      >
        {settings.data ? (
          <form className="settings-form" onSubmit={save}>
            <section className="account-section">
              <h2>Identity and access</h2>
              <div className="settings-grid">
                <Field
                  label="Site name"
                  hint="Used in the sidebar and browser tabs."
                >
                  <input
                    name="SQ_SITE_NAME"
                    defaultValue={settings.data.SQ_SITE_NAME}
                    maxLength={20}
                    required
                  />
                </Field>
                <Field label="Default locale">
                  <select
                    name="SQ_SITE_DEFAULT_LOCALE"
                    defaultValue={settings.data.SQ_SITE_DEFAULT_LOCALE}
                  >
                    {["en", "bg", "es", "it", "ru", "de", "zh", "eo", "fr"].map(
                      (locale) => (
                        <option key={locale} value={locale}>
                          {locale.toUpperCase()}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="Site description">
                  <input
                    name="SQ_SITE_DESCRIPTION"
                    defaultValue={settings.data.SQ_SITE_DESCRIPTION}
                    maxLength={80}
                    required
                  />
                </Field>
                <Field label="Registration">
                  <select
                    name="SQ_ALLOW_REGISTER"
                    defaultValue={settings.data.SQ_ALLOW_REGISTER}
                  >
                    <option value="open">Open</option>
                    <option value="invite">Invite only</option>
                    <option value="closed">Closed</option>
                  </select>
                </Field>
              </div>
              <div className="settings-checks">
                <label>
                  <input
                    name="SQ_SHOW_PAGE_IN_TITLE"
                    type="checkbox"
                    defaultChecked={settings.data.SQ_SHOW_PAGE_IN_TITLE}
                  />
                  Show the localized page name in browser tabs
                </label>
              </div>
            </section>

            <section className="account-section">
              <h2>Tracker rules</h2>
              <div className="settings-grid">
                <Field label="Minimum ratio (-1 disables)">
                  <input
                    name="SQ_MINIMUM_RATIO"
                    type="number"
                    step="0.01"
                    min="-1"
                    defaultValue={settings.data.SQ_MINIMUM_RATIO}
                    required
                  />
                </Field>
                <Field label="Maximum hit 'n' runs (-1 disables)">
                  <input
                    name="SQ_MAXIMUM_HIT_N_RUNS"
                    type="number"
                    min="-1"
                    defaultValue={settings.data.SQ_MAXIMUM_HIT_N_RUNS}
                    required
                  />
                </Field>
              </div>
              <div className="settings-checks">
                <label>
                  <input
                    name="SQ_ALLOW_ANONYMOUS_UPLOADS"
                    type="checkbox"
                    defaultChecked={settings.data.SQ_ALLOW_ANONYMOUS_UPLOADS}
                  />{" "}
                  Allow anonymous uploads
                </label>
                <label>
                  <input
                    name="SQ_SITE_WIDE_FREELEECH"
                    type="checkbox"
                    defaultChecked={settings.data.SQ_SITE_WIDE_FREELEECH}
                  />{" "}
                  Site-wide freeleech
                </label>
                <label>
                  <input
                    name="SQ_ALLOW_UNREGISTERED_VIEW"
                    type="checkbox"
                    defaultChecked={settings.data.SQ_ALLOW_UNREGISTERED_VIEW}
                  />{" "}
                  Public torrent and wiki viewing
                </label>
              </div>
              <Field label="Torrent categories (JSON)">
                <textarea
                  name="SQ_TORRENT_CATEGORIES"
                  rows={8}
                  defaultValue={JSON.stringify(
                    settings.data.SQ_TORRENT_CATEGORIES,
                    null,
                    2,
                  )}
                  required
                />
              </Field>
              <Field label="Blocked file extensions (comma separated)">
                <input
                  name="SQ_EXTENSION_BLACKLIST"
                  defaultValue={settings.data.SQ_EXTENSION_BLACKLIST.join(", ")}
                />
              </Field>
            </section>

            <section className="account-section">
              <h2>Bonus economy</h2>
              <div className="settings-grid">
                <Field label="Points earned per GB">
                  <input
                    name="SQ_BP_EARNED_PER_GB"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.data.SQ_BP_EARNED_PER_GB}
                    required
                  />
                </Field>
                <Field label="Points per filled request">
                  <input
                    name="SQ_BP_EARNED_PER_FILLED_REQUEST"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.data.SQ_BP_EARNED_PER_FILLED_REQUEST}
                    required
                  />
                </Field>
                <Field label="Invite cost">
                  <input
                    name="SQ_BP_COST_PER_INVITE"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.data.SQ_BP_COST_PER_INVITE}
                    required
                  />
                </Field>
                <Field label="Upload GB cost">
                  <input
                    name="SQ_BP_COST_PER_GB"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.data.SQ_BP_COST_PER_GB}
                    required
                  />
                </Field>
              </div>
            </section>

            <section className="account-section">
              <h2>Profile pictures</h2>
              <p>Every upload is resized as needed and stored as WebP.</p>
              <div className="settings-grid">
                <Field label="Maximum resolution (px)">
                  <input
                    name="SQ_AVATAR_MAX_RESOLUTION"
                    type="number"
                    min="64"
                    max="2048"
                    defaultValue={settings.data.SQ_AVATAR_MAX_RESOLUTION}
                    required
                  />
                </Field>
                <Field label="Maximum stored size (KB)">
                  <input
                    name="SQ_AVATAR_MAX_SIZE_KB"
                    type="number"
                    min="32"
                    max="5120"
                    defaultValue={settings.data.SQ_AVATAR_MAX_SIZE_KB}
                    required
                  />
                </Field>
              </div>
              <div className="settings-checks">
                <label>
                  <input
                    name="SQ_ALLOW_GIF_AVATARS"
                    type="checkbox"
                    defaultChecked={settings.data.SQ_ALLOW_GIF_AVATARS}
                  />{" "}
                  Allow animated GIF uploads
                </label>
              </div>
            </section>

            <section className="account-section">
              <h2>Theme</h2>
              <div className="settings-grid color-settings">
                {[
                  "primary",
                  "background",
                  "sidebar",
                  "border",
                  "text",
                  "grey",
                ].map((key) => (
                  <Field label={key[0].toUpperCase() + key.slice(1)} key={key}>
                    <input
                      name={`theme_${key}`}
                      type="text"
                      pattern="#[a-fA-F0-9]{6}"
                      placeholder="#000000"
                      defaultValue={settings.data!.SQ_CUSTOM_THEME[key] ?? ""}
                      required={key === "primary"}
                    />
                  </Field>
                ))}
              </div>
            </section>

            <section className="settings-restart-note">
              <strong>Restart-only settings stay in config.js</strong>
              <span>
                Database, URLs, ports, email transport, and secrets are
                intentionally never sent to the browser.
              </span>
            </section>
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          </form>
        ) : null}
      </ApiState>
    </main>
  );
}
