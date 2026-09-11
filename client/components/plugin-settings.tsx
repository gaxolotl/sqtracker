"use client";

import type {
  PluginManifest,
  PluginSettingDescriptor,
  PluginSettingOption,
  PluginSettingValue,
} from "@sqtrackr/plugin-sdk/client";
import { FormEvent, useState } from "react";
import { ActionMessage, ApiState, Field } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { apiFetch } from "@/lib/api";
import { clientPluginRegistry } from "@/lib/plugins/registry";

type PluginHealth =
  | string
  | { status?: string; message?: string }
  | null;

type AdminPlugin = PluginManifest & {
  description?: string;
  enabled: boolean;
  installed: boolean;
  health?: PluginHealth;
  descriptors: NamedSettingDescriptor[];
  values: Record<string, PluginSettingValue>;
  settings: {
    descriptors: NamedSettingDescriptor[];
    values: Record<string, PluginSettingValue>;
  };
};

type NamedSettingDescriptor = PluginSettingDescriptor & {
  key: string;
  label: string;
};

type AdminPluginsResponse = AdminPlugin[] | { plugins: AdminPlugin[] };

function pluginList(response: AdminPluginsResponse | null) {
  if (!response) return [];
  return Array.isArray(response) ? response : response.plugins;
}

function pluginManifest(plugin: AdminPlugin): PluginManifest {
  return {
    ...plugin,
    description:
      plugin.description ??
      clientPluginRegistry[plugin.id]?.manifest.description,
    permissions: plugin.permissions,
  };
}

function settingLabel(key: string) {
  const label = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ");
  return label[0].toUpperCase() + label.slice(1);
}

function settingDescriptors(plugin: AdminPlugin) {
  return plugin.descriptors.map((descriptor) => ({
    ...descriptor,
    label: descriptor.label || settingLabel(descriptor.key),
  }));
}

function healthDetails(
  health: PluginHealth | undefined,
  enabled = true,
  installed = true,
) {
  if (!installed) return { label: "Removed", detail: "" };
  if (!enabled) return { label: "Disabled", detail: "" };
  if (typeof health === "string") return { label: health, detail: "" };
  return {
    label: health?.status ?? "Unknown",
    detail: health?.message ?? "",
  };
}

function settingOption(option: PluginSettingOption | string | number) {
  return typeof option === "object"
    ? option
    : { label: String(option), value: option };
}

function SettingControl({
  descriptor,
  value,
}: {
  descriptor: NamedSettingDescriptor;
  value: PluginSettingValue | undefined;
}) {
  const initialValue = value ?? descriptor.default ?? "";

  if (descriptor.type === "boolean") {
    return (
      <label className="plugin-setting-check">
        <input
          name={descriptor.key}
          type="checkbox"
          defaultChecked={Boolean(initialValue)}
        />
        <span>{descriptor.description || descriptor.label}</span>
      </label>
    );
  }

  if (descriptor.type === "select" || descriptor.options?.length) {
    return (
      <Field label={descriptor.label} hint={descriptor.description}>
        <select
          name={descriptor.key}
          defaultValue={String(initialValue)}
          required={descriptor.required}
        >
          {(descriptor.options ?? []).map(settingOption).map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (descriptor.type === "textarea") {
    return (
      <Field label={descriptor.label} hint={descriptor.description}>
        <textarea
          name={descriptor.key}
          defaultValue={String(initialValue)}
          required={descriptor.required}
          maxLength={descriptor.maxLength}
          rows={4}
        />
      </Field>
    );
  }

  return (
    <Field label={descriptor.label} hint={descriptor.description}>
      <input
        name={descriptor.key}
        type={
          descriptor.type === "number" || descriptor.type === "integer"
            ? "number"
            : descriptor.type === "password"
              ? "password"
              : "text"
        }
        defaultValue={String(initialValue)}
        required={descriptor.required}
        min={descriptor.min}
        max={descriptor.max}
        step={descriptor.step ?? (descriptor.type === "integer" ? 1 : undefined)}
        maxLength={descriptor.maxLength}
      />
    </Field>
  );
}

function PluginSettingsCard({
  plugin,
  onSaved,
}: {
  plugin: AdminPlugin;
  onSaved: () => void;
}) {
  const manifest = pluginManifest(plugin);
  const descriptors = settingDescriptors(plugin);
  const values = plugin.values;
  const health = healthDetails(plugin.health, plugin.enabled, plugin.installed);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [managing, setManaging] = useState(false);
  const [manageError, setManageError] = useState("");

  async function manage(
    path: string,
    options: RequestInit,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    setManaging(true);
    setManageError("");
    try {
      await apiFetch(path, options);
      onSaved();
    } catch (requestError) {
      setManageError(
        requestError instanceof Error
          ? requestError.message
          : `Could not update ${manifest.name}.`,
      );
    } finally {
      setManaging(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextValues: Record<string, PluginSettingValue> = {};

    for (const descriptor of descriptors) {
      if (descriptor.type === "boolean") {
        nextValues[descriptor.key] = form.has(descriptor.key);
      } else if (descriptor.type === "select" || descriptor.options?.length) {
        const selected = String(form.get(descriptor.key) ?? "");
        const option = (descriptor.options ?? [])
          .map(settingOption)
          .find((candidate) => String(candidate.value) === selected);
        nextValues[descriptor.key] = option?.value ?? selected;
      } else if (
        descriptor.type === "number" ||
        descriptor.type === "integer"
      ) {
        nextValues[descriptor.key] = Number(form.get(descriptor.key));
      } else {
        nextValues[descriptor.key] = String(form.get(descriptor.key) ?? "");
      }
    }

    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiFetch(`/admin/plugins/${encodeURIComponent(manifest.id)}/settings`, {
        method: "PUT",
        body: JSON.stringify(nextValues),
      });
      setMessage(`${manifest.name} settings saved.`);
      onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Could not save ${manifest.name} settings.`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="plugin-admin-card">
      <header className="plugin-admin-heading">
        <div>
          <h2>{manifest.name}</h2>
          <span>v{manifest.version}</span>
        </div>
        <span
          className={`plugin-health plugin-health-${health.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
          title={health.detail || health.label}
        >
          {health.label}
        </span>
      </header>
      {manifest.description ? (
        <p className="plugin-description">{manifest.description}</p>
      ) : null}
      <div className="plugin-permissions">
        <strong>Permissions</strong>
        {manifest.permissions?.length ? (
          <div>
            {manifest.permissions.map((permission) => (
              <code key={permission}>{permission}</code>
            ))}
          </div>
        ) : (
          <span>None requested</span>
        )}
      </div>
      <div className="plugin-admin-actions">
        {plugin.installed ? (
          <button
            className="secondary-button compact-button"
            type="button"
            disabled={managing}
            onClick={() =>
              manage(
                `/admin/plugins/${encodeURIComponent(manifest.id)}/enabled`,
                {
                  method: "PUT",
                  body: JSON.stringify({ enabled: !plugin.enabled }),
                },
              )
            }
          >
            {plugin.enabled ? "Disable" : "Enable"}
          </button>
        ) : (
          <button
            className="primary-button compact-button"
            type="button"
            disabled={managing}
            onClick={() =>
              manage(
                `/admin/plugins/${encodeURIComponent(manifest.id)}/install`,
                { method: "POST" },
              )
            }
          >
            Install
          </button>
        )}
        {plugin.installed ? (
          <button
            className="secondary-button compact-button danger-action"
            type="button"
            disabled={managing}
            onClick={() =>
              manage(
                `/admin/plugins/${encodeURIComponent(manifest.id)}`,
                { method: "DELETE" },
                `Remove ${manifest.name}? This deletes its stored settings and data.`,
              )
            }
          >
            Remove
          </button>
        ) : null}
      </div>
      <ActionMessage error={manageError} />
      {!plugin.installed ? (
        <p className="plugin-settings-empty">
          Install this plugin to configure it.
        </p>
      ) : descriptors.length ? (
        <form className="plugin-settings-form" onSubmit={save}>
          <div className="settings-grid">
            {descriptors.map((descriptor) => (
              <SettingControl
                descriptor={descriptor}
                key={descriptor.key}
                value={values[descriptor.key]}
              />
            ))}
          </div>
          <ActionMessage message={message} error={error} />
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving..." : `Save ${manifest.name}`}
            </button>
          </div>
        </form>
      ) : (
        <p className="plugin-settings-empty">
          This plugin has no configurable settings.
        </p>
      )}
    </article>
  );
}

export function PluginSettings() {
  const plugins = useApiData<AdminPluginsResponse>("/admin/plugins");
  const installed = pluginList(plugins.data);

  return (
    <ApiState
      loading={plugins.loading}
      error={plugins.error}
      empty={!plugins.loading && !installed.length}
    >
      <div className="plugin-admin-list">
        {installed.map((plugin) => {
          const manifest = pluginManifest(plugin);
          return (
            <PluginSettingsCard
              key={manifest.id}
              plugin={plugin}
              onSaved={plugins.reload}
            />
          );
        })}
      </div>
    </ApiState>
  );
}
