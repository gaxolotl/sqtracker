"use client";

import { Check, Copy, FileUp, Info, Link2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { ActionMessage, Field, PageHeader, SignInRequired } from "@/components/ui";
import { apiFetch, apiOrigin } from "@/lib/api";
import { configCategoryOptions, type CategoryOption } from "@/lib/categories";
import { useTrackerConfig } from "@/hooks/use-tracker-config";

const fallbackCategories: CategoryOption[] = [
  { name: "Movies", slug: "movies", sources: ["bluray", "webdl", "hdrip", "webrip", "dvd", "cam"] },
  { name: "TV", slug: "tv", sources: [] },
  { name: "Books", slug: "books", sources: [] },
  { name: "Music", slug: "music", sources: [] },
  { name: "Games", slug: "games", sources: [] },
  { name: "Software", slug: "software", sources: [] },
];

export function UploadPage() {
  const { session } = useAuth();
  const router = useRouter();
  const { config } = useTrackerConfig();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState("");
  const categoryOptions = configCategoryOptions(config.categories, fallbackCategories);
  const selectedCategory = categoryOptions.find((option) => option.slug === category);
  const categorySources = selectedCategory?.sources ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Choose a .torrent file first."); return; }
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const binary = await file.arrayBuffer();
      const bytes = new Uint8Array(binary);
      let value = "";
      for (const byte of bytes) value += String.fromCharCode(byte);
      const result = await apiFetch<string | { infoHash?: string }>("/torrent/upload", {
        method: "POST",
        body: JSON.stringify({
          torrent: btoa(value),
          name: form.get("name"),
          type: form.get("type"),
          source: form.get("source") || undefined,
          description: form.get("description"),
          tags: form.get("tags"),
          mediaInfo: form.get("mediaInfo") || undefined,
          anonymous: form.get("anonymous") === "on",
        }),
      });
      const infoHash = typeof result === "string" ? result : result.infoHash;
      router.push(infoHash ? `/torrent/${infoHash}` : "/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Upload failed.");
    } finally { setSubmitting(false); }
  }

  if (!session) return <main className="page"><SignInRequired /></main>;
  const announceUrl = `${apiOrigin()}/announce/${session.uid}`;

  async function copyAnnounceUrl() {
    try {
      await navigator.clipboard.writeText(announceUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = announceUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }
  return (
    <main className="page form-page">
      <PageHeader title="Upload" />
            <p className="announce-hint"><Link2 aria-hidden="true" /><span>Announce URL must point to this tracker before the upload can be accepted.</span><span className="info-tooltip" tabIndex={0} aria-label={announceUrl}><Info aria-hidden="true" /><span role="tooltip">The announce URL is the tracker address inside a .torrent that your client reports to. Torrents you upload must point to it so your upload and download stats are counted.<button type="button" className="tooltip-copy" onClick={copyAnnounceUrl}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied to clipboard" : announceUrl}</button></span></span></p>
      <form className="stack-form wide-form" onSubmit={submit}>
        <Field label="Torrent file">
          <label className="drop-zone"><FileUp aria-hidden="true" /><strong>{file?.name ?? "Drag a .torrent file here, or click to select"}</strong><input type="file" accept=".torrent,application/x-bittorrent" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        </Field>
        <Field label="Name"><input name="name" required /></Field>
        <div className="form-grid"><Field label="Category"><select name="type" required value={category} onChange={(event) => setCategory(event.target.value)}><option value="" disabled>Select a category</option>{categoryOptions.map((option) => <option value={option.slug} key={option.slug}>{option.name}</option>)}</select></Field><Field label="Source"><select name="source" required={Boolean(categorySources.length)} disabled={!categorySources.length} defaultValue=""><option value="">{categorySources.length ? "Select a source" : "No source required"}</option>{categorySources.map((source) => <option value={source} key={source}>{source.toUpperCase()}</option>)}</select></Field></div>
        <Field label="Description"><textarea name="description" rows={8} required placeholder="Markdown supported" /></Field>
        <Field label="Tags"><input name="tags" placeholder="Separated by commas" /></Field>
        <Field label="Media info"><textarea name="mediaInfo" rows={5} placeholder="Optional technical metadata" /></Field>
        {config.allowAnonymousUploads ? <label className="check-field"><input name="anonymous" type="checkbox" /> Upload anonymously</label> : null}
        <ActionMessage error={error} />
        <div className="form-actions"><button className="primary-button" type="submit" disabled={submitting}>{submitting ? "Uploading…" : "Upload"}</button></div>
      </form>
    </main>
  );
}
