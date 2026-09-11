# Contributing to sqtrackr

Contributions to sqtrackr are welcome. Trackers are often forked and modified, and ideally any changes and new features make their way upstream so that other deployments can benefit from them.

Read this before opening a change. It covers the development setup, the current application architecture, the code style we expect, and the checks that must pass.

## Development setup

- Use **Bun** 1.4 or newer.
- Install dependencies with `bun install`.
- Run both workspaces with `bun dev`, or use `bun api:dev` and `bun client:dev` separately.
- Copy `config.example.js` to the ignored `config.js` for local deployment values. Never commit secrets from `config.js`.

## Architecture

- `api/` contains Express routes, controllers, Mongoose schemas, tracker logic, plugin hosting, and runtime configuration handling.
- `client/` contains the Next.js application, shared components, locale dictionaries, hooks, and global CSS.
- `packages/plugin-sdk` contains the shared plugin SDK. First-party plugins live in `plugins/`.
- Runtime-safe settings changed at `/settings` are stored in MongoDB and apply without restarting. Secret and infrastructure settings stay in `config.js`.
- Authentication uses bearer JWTs. RSS access is intentionally separate and uses a revocable per-user feed token.
- Profile images are converted to WebP by the API. Do not bypass the Sharp validation and compression path.
- Plugins are trusted, build-time code. See [`PLUGINS.md`](./PLUGINS.md) for the full plugin API.

## Code style

Please follow existing conventions in code style. If you PR any messy, redundant or hard to understand code then expect changes to be requested on your PR.

### Linting

All client contributions **must** pass `bun run --filter @sqtracker/client lint` and `bun run --filter @sqtracker/client build`. Use Bun for every workspace command.

### Comments

If you think a section of code is hard to understand without supporting comments, then please add them to explain what the code is doing. Don't however add redundant comments all over the place if the code can be understood just be reading it.

### CSS

When working on the front-end, use the existing CSS variables and responsive layout conventions. Preserve the flat visual language and do not introduce gradients. Verify both desktop and mobile layouts for UI changes.

## Contribution requirements

- Preserve existing behavior unless the change explicitly replaces it.
- Enforce permissions in the API, not only in the UI.
- Do not return passwords, tokens, avatar binary data, SMTP values, database URLs, or signing secrets from JSON endpoints.
- Render user content through `client/lib/markdown.tsx`; never inject raw HTML.
- Add new translation keys to every file in `client/locales/`, and keep every locale JSON synchronized with `en.json`.
- When adding a runtime setting, update its schema, parser category and fallback, the public config response if needed, the client type and fallback, the admin form, and `config.example.js`.
- Keep changes focused and avoid unrelated formatting churn.

## Required checks

```sh
bun run --filter @sqtracker/client lint
bun run --filter @sqtracker/client build
bun build --no-bundle --target=bun api/src/index.js > /dev/null
git diff --check
```

For API behavior changes, also run `bun build --no-bundle --target=bun` on the changed files and exercise the endpoint against a running API with MongoDB when possible. Include what you tested in the pull request description.

## License

By contributing, you agree that your contributions are licensed under the GNU GPLv3, the same license as this project.
