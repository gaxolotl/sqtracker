"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import {
  ActionMessage,
  ApiState,
  Field,
  PageHeader,
  SignInRequired,
} from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { ApiError, apiFetch } from "@/lib/api";
import { FORUM_ICONS, forumIcon } from "@/lib/forum-icons";
import type { ForumCategory } from "@/lib/types";

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="icon-picker" role="radiogroup" aria-label="Forum icon">
      {FORUM_ICONS.map(({ name, Icon }) => (
        <button
          key={name}
          type="button"
          className={value === name ? "icon-option selected" : "icon-option"}
          title={name}
          aria-label={name}
          aria-pressed={value === name}
          onClick={() => onChange(name)}
        >
          <Icon aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function ForumAdmin() {
  const { session } = useAuth();
  const { data, error, loading, reload } = useApiData<ForumCategory[]>(
    session ? "/forum/categories" : null,
  );
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createIcon, setCreateIcon] = useState("messages-square");
  const [editIcon, setEditIcon] = useState("messages-square");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  const editingCategory =
    data?.find((category) => category._id === editingId) ?? null;

  if (!session) {
    return (
      <main className="page forum-page">
        <SignInRequired />
      </main>
    );
  }

  if (session.role !== "admin") {
    return (
      <main className="page forum-page">
        <PageHeader title="Forum settings" />
        <div className="state-panel state-error">
          Only administrators can manage forum categories.
        </div>
      </main>
    );
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSubmitting(true);
    setActionError("");
    setMessage("");
    try {
      await apiFetch("/forum/category", {
        method: "POST",
        body: JSON.stringify({
          name: values.get("name"),
          description: values.get("description"),
          sortOrder: Number(values.get("sortOrder")),
          icon: createIcon,
        }),
      });
      form.reset();
      setCreating(false);
      setCreateIcon("messages-square");
      setMessage("Category created.");
      reload();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create the category.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(category: ForumCategory) {
    setEditingId(category._id);
    setEditIcon(category.icon ?? "messages-square");
    setActionError("");
    setMessage("");
  }

  async function saveCategory(
    event: FormEvent<HTMLFormElement>,
    category: ForumCategory,
  ) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSubmitting(true);
    setActionError("");
    setMessage("");
    try {
      await apiFetch(`/forum/category/${category._id}/edit`, {
        method: "POST",
        body: JSON.stringify({
          name: values.get("name"),
          description: values.get("description"),
          sortOrder: Number(values.get("sortOrder")),
          icon: editIcon,
        }),
      });
      setEditingId(null);
      setMessage("Category updated.");
      reload();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update the category.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteCategory(category: ForumCategory) {
    if (!window.confirm(`Delete the "${category.name}" category?`)) return;
    setActionError("");
    setMessage("");
    try {
      await apiFetch(`/forum/category/${category._id}`, { method: "DELETE" });
      setEditingId(null);
      setMessage("Category deleted.");
      reload();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 409) {
        setActionError(
          "This category cannot be deleted until all of its threads are removed.",
        );
      } else {
        setActionError(
          requestError instanceof Error
            ? requestError.message
            : "Could not delete the category.",
        );
      }
    }
  }

  return (
    <main className="page forum-page forum-admin-page">
      <PageHeader
        title="Forum settings"
        actions={
          <Link className="secondary-button button-link" href="/forum">
            <ArrowLeft aria-hidden="true" /> Back to forum
          </Link>
        }
      />
      <ActionMessage message={message} error={actionError} />

      <section className="content-section forum-admin-toolbar">
        <button
          className={
            creating
              ? "secondary-button compact-button"
              : "primary-button compact-button"
          }
          type="button"
          onClick={() => {
            setCreating((open) => !open);
            setActionError("");
          }}
        >
          {creating ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
          {creating ? "Close" : "New category"}
        </button>
      </section>

      {creating ? (
        <section className="forum-category-management forum-category-management-open">
          <h2 className="section-title">Create a category</h2>
          <form
            className="stack-form forum-category-form"
            onSubmit={createCategory}
          >
            <Field label="Name">
              <input name="name" maxLength={100} required />
            </Field>
            <Field label="Description">
              <input name="description" maxLength={1000} />
            </Field>
            <Field label="Sort order">
              <input name="sortOrder" type="number" defaultValue="0" required />
            </Field>
            <Field label="Icon">
              <IconPicker value={createIcon} onChange={setCreateIcon} />
            </Field>
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create category"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {editingCategory && editingId ? (
        <section className="forum-category-management forum-category-management-open">
          <h2 className="section-title">
            Edit &quot;{editingCategory.name}&quot;
          </h2>
          <form
            className="stack-form forum-category-form"
            key={editingCategory._id}
            onSubmit={(event) => saveCategory(event, editingCategory)}
          >
            <Field label="Name">
              <input
                name="name"
                maxLength={100}
                required
                defaultValue={editingCategory.name}
              />
            </Field>
            <Field label="Description">
              <input
                name="description"
                maxLength={1000}
                defaultValue={editingCategory.description ?? ""}
              />
            </Field>
            <Field label="Sort order">
              <input
                name="sortOrder"
                type="number"
                required
                defaultValue={editingCategory.sortOrder}
              />
            </Field>
            <Field label="Icon">
              <IconPicker value={editIcon} onChange={setEditIcon} />
            </Field>
            <div className="form-actions forum-edit-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={submitting}
              >
                Save changes
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="content-section forum-category-section">
        <ApiState loading={loading} error={error} empty={!data?.length}>
          <div className="forum-admin-list">
            <div className="forum-admin-head">
              <span>Category</span>
              <span>Order</span>
              <span>Actions</span>
            </div>
            {data?.map((category) => {
              const Icon = forumIcon(category.icon);
              return (
                <article className="forum-admin-row" key={category._id}>
                  <div className="forum-admin-board">
                    <span className="forum-board-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <div>
                      <strong>{category.name}</strong>
                      <p>{category.description || "No description"}</p>
                    </div>
                  </div>
                  <span className="forum-admin-order">
                    {category.sortOrder}
                  </span>
                  <div className="forum-admin-actions">
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      onClick={() =>
                        editingId === category._id
                          ? setEditingId(null)
                          : startEditing(category)
                      }
                    >
                      <Pencil aria-hidden="true" /> Edit
                    </button>
                    <button
                      className="secondary-button compact-button danger-action"
                      type="button"
                      onClick={() => deleteCategory(category)}
                    >
                      <Trash2 aria-hidden="true" /> Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </ApiState>
      </section>
    </main>
  );
}
