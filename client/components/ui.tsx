"use client";

import Link from "next/link";
import { AlertCircle, CircleHelp, LoaderCircle, LogIn } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/components/toast-context";
import { useI18n } from "@/components/i18n-context";

export function PageHeader({
  title,
  titleTooltip,
  info,
  actions,
}: {
  title: string;
  titleTooltip?: string;
  info?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div
        className={`page-title-row${title.length > 56 ? " long-title" : ""}`}
      >
        <h1 title={titleTooltip ?? title}>{title}</h1>
        {info ? (
          <span className="info-tooltip" tabIndex={0} aria-label={info}>
            <CircleHelp aria-hidden="true" />
            <span role="tooltip">{info}</span>
          </span>
        ) : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function ApiState({
  loading,
  error,
  empty,
  children,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  if (loading)
    return (
      <div className="state-panel">
        <LoaderCircle className="spin" aria-hidden="true" /> {t("loading")}
      </div>
    );
  if (error)
    return (
      <div className="state-panel state-error">
        <AlertCircle aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  if (empty) return <div className="state-panel">{t("nothingHere")}</div>;
  return <>{children}</>;
}

export function SignInRequired() {
  const { t } = useI18n();
  return (
    <div className="state-panel sign-in-panel">
      <LogIn aria-hidden="true" />
      <span>{t("signInRequired")}</span>
      <Link className="primary-button compact-button" href="/login">
        {t("login")}
      </Link>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function ActionToast({
  text,
  variant,
}: {
  text: string;
  variant: "success" | "error";
}) {
  const { notify } = useToast();
  useEffect(() => {
    notify(text, variant);
  }, [text, variant, notify]);
  return null;
}

export function ActionMessage({
  message,
  error,
}: {
  message?: string;
  error?: string;
}) {
  if (error) return <ActionToast text={error} variant="error" />;
  if (message) return <ActionToast text={message} variant="success" />;
  return null;
}
