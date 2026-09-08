"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { ActionMessage, Field, PageHeader, SignInRequired } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export function RequestEditor() {
  const { session } = useAuth(); const router = useRouter(); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  if (!session) return <main className="page"><SignInRequired /></main>;
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSubmitting(true); setError(""); const form = new FormData(event.currentTarget); try { const result = await apiFetch<{ index: number }>("/requests/new", { method: "POST", body: JSON.stringify({ title: form.get("title"), body: form.get("body") }) }); router.push(`/requests/${result.index}`); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not create request."); } finally { setSubmitting(false); } }
  return <main className="page form-page"><PageHeader title="New request" /><form className="stack-form wide-form" onSubmit={submit}><Field label="Title"><input name="title" required /></Field><Field label="Details"><textarea name="body" rows={10} required placeholder="Describe exactly what you are looking for" /></Field><ActionMessage error={error} /><div className="form-actions"><button className="primary-button" disabled={submitting}>{submitting ? "Posting…" : "Post request"}</button></div></form></main>;
}
