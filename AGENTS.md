<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

Vitest with a default `node` environment. Add `// @vitest-environment jsdom` at the top of files that render components or hooks. IndexedDB tests run in Vitest browser mode (real Chromium via Playwright), not with `fake-indexeddb`.

Colocate tests as `*.test.ts` or `*.test.tsx` beside the module under test. Prefer direct invocation over spinning up a server: route handlers take a `NextRequest`, Server Action logic is tested as plain async functions with `next/*` mocked at the module boundary.

Use React Testing Library for UI: query by role or accessible name, assert user-visible behavior, avoid implementation details. Mock dependencies with `vi.mock` at import paths (`@/db/...`), not deep internals. Database tests use `createTestDb()` from `db/test-db.ts`. Build request and assertion URLs from `env.BASE_URL` (validated from `.env.test` via `vitest.setup.ts`).

Do not unit-test async Server Components — extract testable logic or cover the route in Playwright. Test env vars live in `.env.test`; never read production secrets in tests.

Skip Vite plugins unless a test fails without them: `resolve.tsconfigPaths` covers `@/*`, esbuild handles JSX from tsconfig.

## Commit messages

Use imperative mood, sentence case, no trailing period. Start with a capital verb, lowercase the rest unless a proper noun.

## Error messages

Sentence case, no trailing period, no `Error:` prefix; the thrower already supplies that context. State what is wrong rather than what the caller should have done: `Thread already resolved`, not `You cannot resolve this twice`.

When a message names a record, append the identifier after a colon: `Comment not found: ${commentId}`. Omit it only when there is nothing useful to attach. API responses use the same casing as a noun phrase describing the rejected input (`Invalid patches`, `Unauthorized`) because the text reaches the client verbatim.

Errors constructed as test fixtures are opaque values, not messages, so they need none of this.

## Comments

Only comment to record a constraint the code cannot show: an upstream quirk, a browser difference, a non-obvious ordering requirement. Never narrate what the code does, and never explain a change you just made.

Always use block form: `/** … */` on an exported symbol so the note surfaces on hover at call sites, `/* … */` everywhere else. Open and close on their own lines, align a leading asterisk under the first one on every continuation line, wrap at 80 columns, and write full sentences. Lead with the external constraint, then the workaround it forces.

Tool directives (`@type`, `@__PURE__`, `/// <reference>`) are exempt; leave them in whatever form the tool requires.
