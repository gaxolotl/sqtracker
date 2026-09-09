"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import {
  ActionMessage,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { apiFetch } from "@/lib/api";

export function MessageCompose({
  initialRecipient = "",
}: {
  initialRecipient?: string;
}) {
  const { session } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return (
      <main className="page messages-page">
        <SignInRequired />
      </main>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const participants = String(form.get("participants") ?? "")
      .split(",")
      .map((username) => username.trim())
      .filter(Boolean);

    if (!participants.length) {
      setError("Enter at least one recipient username.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch<{ conversationId: string }>("/messages", {
        method: "POST",
        body: JSON.stringify({
          participants,
          subject: String(form.get("subject") ?? ""),
          body: String(form.get("body") ?? ""),
        }),
      });
      router.push(`/messages/${encodeURIComponent(result.conversationId)}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not start the conversation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page form-page messages-page messages-compose-page">
      <PageHeader title="New conversation" />
      <form
        className="messages-compose-form stack-form wide-form"
        onSubmit={submit}
      >
        <Field
          label="Participants"
          hint="Enter comma-separated usernames. Conversations support up to 8 people total; an existing one-to-one conversation is reused."
        >
          <input
            name="participants"
            required
            defaultValue={initialRecipient}
            autoComplete="off"
            placeholder="username, another-user"
          />
        </Field>
        <Field
          label="Subject"
          hint="Optional for group conversations, up to 120 characters."
        >
          <input name="subject" maxLength={120} />
        </Field>
        <Field label="Message" hint="Private messages are sent as plain text.">
          <textarea
            name="body"
            rows={12}
            required
            maxLength={50000}
            placeholder="Write your message"
          />
        </Field>
        <ActionMessage error={error} />
        <div className="messages-compose-actions form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            <Send aria-hidden="true" />{" "}
            {submitting ? "Starting..." : "Start conversation"}
          </button>
        </div>
      </form>
    </main>
  );
}
