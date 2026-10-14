<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Better Diffs

Share a working-tree diff as a link, without a PR; teammates view it and leave comments. A Go CLI (`cli/`) uploads the diff, a Next.js app on Vercel serves it, libsql (Turso in production, a local file in development, `:memory:` in tests) stores it.

## Words

Use these in code, routes, errors and UI. A new concept gets a line here in the same change.

- **Share**: one uploaded diff and its link, `/d/{shareId}`; `/d/{shareId}.patch` serves the uploaded text unchanged. Expires 7 days after it was last visited (`app/api/cron`, `lastVisitedAt`); viewing refreshes it at most once an hour (`touchShare`), and commenting refreshes it. A Share with `pinned` set is never deleted by the cron.
- **Patch**: one unified-diff document inside a Share. `POST /api/diffs` takes patch text only, which may hold several (as `git format-patch` output does), up to 2 MiB per upload.
- **Uploader key**: an HMAC of the client address (`x-real-ip`, set by Vercel) stored on a Share, so `POST /api/diffs` can refuse more than 30 uploads an hour from one client with 429 `RATE_LIMITED`. The cron clears it once the Share is an hour old. Without the header, as in development, uploads are not limited.
- **File**: one file's diff inside a Patch, stored as `@pierre/diffs` `FileDiffMetadata`.
- **Thread**: a conversation anchored to a line (`Anchor`: file path, side, line). It can be resolved, never reopened or deleted.
- **Comment**: one Lexical rich-text body in a Thread. It can be edited and deleted, except a Thread's last Comment, which can only be edited.
- **Revision**: a counter on a Share, raised by every write to its Threads and Comments. The page starts from a snapshot of the rows, polls for a new snapshot after its revision (`/api/shares/{shareId}/threads?afterRevision=`), which answers `null` when nothing changed, and shows a change before it is stored with `useOptimistic` (`threads/provider.tsx`). A deleted Comment's row is gone, so its body is never sent. Deleting a user who has Threads or Comments is refused.
- **Actor**: the signed-in GitHub user who wrote a Thread or Comment. Viewing needs no account, commenting does.
- **Review state**: per-browser state such as viewed, collapsed and unsent drafts, kept in localStorage (`review-state-provider.tsx`). Never sent to the server.

## Where code goes

Application code lives in top-level folders beside config, `cli/` and `docs/`; there is no `src/`, and `@/` resolves to the root. Folders are grouped by what the code touches, not by feature. ESLint enforces the boundaries in `eslint.config.js`, and each diagnostic says where the code belongs instead.

- `app/` holds routes. A segment's own code lives beside it in `_components/`, `_hooks/` and `_lib/` and is imported relatively; the root layout's fonts are in `app/_lib/fonts.ts`. Nothing imports `@/app/...`; once a second segment needs something, it moves to a top-level folder.
- `app/api/**/route.ts` holds route handlers, each wrapped in `route()` from `http/route.ts`. Validate with `parse`, `parseSearchParams` and `readJson`; fail by throwing `ApiError` with a `reason` in SCREAMING_SNAKE_CASE. `route()` turns it into the JSON envelope, or into plain text for a client that prefers it, which is how the CLI reads errors.
- `http/` is the HTTP toolkit both sides share: `route.ts` (server-only), `error.ts` (`ApiError` and its envelope), `fetch.ts` (`fetchJson`, which turns the envelope back into an `ApiError` in the browser), and `headers/`, parsers for `Accept`, `Authorization` and `Content-Type`. It is not `app/api/`, which holds the routes themselves.
- `env.ts` validates the environment with t3-env. Import `env` from `@/env` rather than reading `process.env`.
- `threads/actions.ts` holds the server actions, the only write path for Threads and Comments. Each validates its input, resolves the Actor and calls `saveChanges`, which writes the rows and raises the Revision in one transaction after `check` (`threads/state.ts`) tests the change against the Threads it touches and their Comments, so an invalid change is refused before it is stored. A refused change is returned, not thrown, as a `ThreadError` (`threads/errors.ts`) with a `reason` in SCREAMING_SNAKE_CASE; an action that succeeds returns `undefined`. Next.js hides thrown errors from the browser in production, so a thrown error means a bug, not a refusal.
- `db/` holds queries, as plain async functions over Drizzle. It may import `@/env`, `@/utils/*`, `@/threads/schemas` and `@/threads/errors` only; anything else arrives as an argument, as `saveChanges` takes `validate`.
- `auth/` holds Better Auth: `server.ts` and `bearer.ts` are server-only, `client.ts` and the providers are client-side.
- Pure modules take plain values and return plain values, with no React, Next.js, storage or network: `utils/`, `http/headers/`, `http/error.ts`, `threads/{schemas,state,actor,errors}.ts`, `diffs/{annotations,contents,empty,lines,schemas,stats}.ts` and `trees/input.ts`. They are where logic goes so it can be unit tested without mocks.
- `diffs/`, `trees/` and `lexical/` adapt `@pierre/diffs`, `@pierre/trees` and Lexical to this app; `hooks/` holds React hooks shared across segments.
- Mark server-only files with `import 'server-only'` and browser-only ones with `import 'client-only'`. The lint rules catch a bad import before the build does and say why.

## Conventions

- Within a folder, import relatively (`./schemas`); across folders, use `@/`. Tests are the exception and may use `@/` throughout.
- zod schemas share a name with their inferred type (`export const Anchor = z.object(...)`, `export type Anchor = z.infer<typeof Anchor>`).
- `undefined` is the only "nothing" our code writes: a missing field, a lookup with no result, a variable not yet assigned, a function with nothing to return. `null` appears only where JSON, SQL, the DOM, React or a library produces it, requires it or documents it as the convention, as React does with `useRef(null)` and `createContext(null)`; pass it through as given, and convert only where a value enters a type that needs the other (`?? null` when writing JSON). A type of our own holds both only when they mean different things, as in a partial update where `undefined` leaves a field alone and `null` clears it. Check presence with `isDefined` from `utils/is-defined.ts`, which accepts both.
- Tests sit in a `__tests__/` folder beside the code. `*.browser.test.ts(x)` runs in real Chromium; every other test runs in Node. Database tests call `setupTestDb()` from `db/__tests__/setup.ts`, which builds the schema in memory and clears it before each test.
- The schema has no migrations: `bun run db:push` applies `db/schema` directly.

## Verify before reporting done

1. `bun run check`: Prettier, `next typegen` with `tsc`, and ESLint. The pre-commit hook runs the type check and lint-staged.
2. `bun run test`. The browser project needs Chromium once: `bunx playwright install chromium`.
3. After touching `cli/`, run `gofmt -l .`, `go vet ./...` and `go test ./...` from `cli/`.
4. After touching UI, run the app (`bun run dev`) and use the changed screen, in both light and dark themes.
