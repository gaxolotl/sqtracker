# Agent Guide

## Repository

- This is a pnpm monorepo with `api` and `client` workspaces. Use pnpm, not yarn or npm, for project commands.
- The API is an Express/Mongoose application using ESM source and Babel at runtime.
- The client is Next.js 16 with React 19. Read and follow the additional generated rules in `client/AGENTS.md` before changing client code.
- The worktree may contain ongoing changes. Never discard or rewrite unrelated modifications.

## Configuration

- `config.js` is deployment-local and contains secrets. Never expose, log, commit, or return its secret and infrastructure values to the client.
- `config.example.js` defines documented defaults for deployments.
- Runtime-safe admin settings are defined and validated in `api/src/utils/runtimeSettings.js`, persisted in the `siteSettings` collection, copied into `process.env`, and exposed selectively by `GET /config`.
- When adding a runtime setting, update its schema, parser category and fallback, public config response if needed, client type/fallback, admin form, and `config.example.js`.
- Infrastructure settings such as MongoDB, JWT, SMTP, server secrets, ports, and service URLs remain restart-only.

## Authentication And Routes

- Browser authentication uses a bearer JWT stored in local storage. Do not assume normal browser cookies contain an authenticated session.
- API authorization must use the database-backed `req.userRole`; client-side role checks are only presentation safeguards.
- Roles are `user`, `staff`, and `admin`. Staff can moderate; only admins can manage site settings and forum categories.
- Public handlers are registered before the authentication middleware. Authenticated requests must bypass anonymous handlers so private records are not mistaken for missing records.
- RSS uses a per-user RSS token because feed readers cannot use the browser's local-storage JWT.

## User Content

- Render user Markdown through `client/lib/markdown.tsx`; never inject raw HTML.
- Avatars are stored in MongoDB, processed by Sharp, converted to WebP, and constrained by runtime resolution and file-size settings.
- Keep user private fields out of public projections. Email, security state, and moderation details are admin-only.

## Client Conventions

- Keep every locale JSON file synchronized with `client/locales/en.json`; TypeScript derives valid message keys from English.
- User-facing action feedback uses `ActionMessage`, which emits global toasts rather than permanent inline banners.
- Preserve the current flat visual language and CSS variables. Do not introduce gradients.
- Verify both desktop and mobile layouts for UI changes.

## Verification

Run the relevant checks before finishing:

```sh
pnpm --filter @sqtracker/client lint
pnpm --filter @sqtracker/client build
node --check api/src/index.js
git diff --check
```

For API behavior changes, also load the changed modules or exercise the endpoint against a running API. Never leave test users, avatars, tokens, or temporary settings behind.
