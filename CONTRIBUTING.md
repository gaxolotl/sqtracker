# Contributing to sqtracker

Contributions to sqtracker are welcome. Trackers are often forked and modified, and ideally any changes and new features make their way upstream so that other users can benefit from them.

## Code style

Please follow existing conventions in code style. If you PR any messy, redundant or hard to understand code then expect changes to be requested on your PR.

### Linting

All client contributions **must** pass `pnpm --filter @sqtracker/client lint` and `pnpm --filter @sqtracker/client build`. Use pnpm for every workspace command.

### Comments

If you think a section of code is hard to understand without supporting comments, then please add them to explain what the code is doing. Don't however add redundant comments all over the place if the code can be understood just be reading it.

### CSS

When working on the front-end, use the existing CSS variables and responsive layout conventions. Preserve the flat visual language and do not introduce gradients.
