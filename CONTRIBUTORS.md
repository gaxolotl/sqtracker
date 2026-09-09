# Contributor Notes

Read this before opening a change. `CONTRIBUTING.md` contains the general contribution policy; the notes below describe the current application architecture and required checks.

## Development Setup

- Use Node.js 22 or newer and pnpm.
- Install dependencies with `pnpm install`.
- Run both workspaces with `pnpm dev`, or use `pnpm api:dev` and `pnpm client:dev` separately.
- Copy `config.example.js` to the ignored `config.js` for local deployment values. Never commit secrets from `config.js`.

## Architecture

- `api/` contains Express routes, controllers, Mongoose schemas, tracker logic, and runtime configuration handling.
- `client/` contains the Next.js application, shared components, locale dictionaries, hooks, and global CSS.
- Runtime-safe settings changed at `/settings` are stored in MongoDB and apply without restarting. Secret and infrastructure settings stay in `config.js`.
- Authentication uses bearer JWTs. RSS access is intentionally separate and uses a revocable per-user feed token.
- Profile images are converted to WebP by the API. Do not bypass the Sharp validation and compression path.

## Contribution Requirements

- Preserve existing behavior unless the change explicitly replaces it.
- Enforce permissions in the API, not only in the UI.
- Do not return passwords, tokens, avatar binary data, SMTP values, database URLs, or signing secrets from JSON endpoints.
- Escape or safely render all user content. Use the existing Markdown renderer for Markdown fields.
- Add new translation keys to every file in `client/locales/`.
- Keep layouts responsive and consistent with the existing design. Do not add gradients.
- Keep changes focused and avoid unrelated formatting churn.

## Required Checks

```sh
pnpm --filter @sqtracker/client lint
pnpm --filter @sqtracker/client build
git diff --check
```

Run `node --check` on changed API files and test changed endpoints against MongoDB when possible. Include what was tested in the pull request description.
