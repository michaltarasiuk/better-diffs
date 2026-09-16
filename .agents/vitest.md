# Vitest in this repo

Repo-specific conventions. For Vitest API and config, use
`.agents/skills/vitest/SKILL.md`.

- **Projects:** `unit` (default `node`) and `browser` (Playwright). Use
  `bun run test:unit`, `bun run test:browser`, or `bun run test` for both.
- **Environments:** keep `node` unless the test needs DOM. Add
  `// @vitest-environment jsdom` for hooks and components. IndexedDB tests run
  in browser mode (`events/idb.test.ts`) — never use `fake-indexeddb`.
- **Placement:** colocate `*.test.ts` / `*.test.tsx` beside the module under
  test.
- **API routes:** call handlers directly with `NextRequest`; build URLs from
  `env.BASE_URL`. Mock with `vi.mock` at import paths (`@/db/...`), not deep
  internals.
- **Env:** test vars live in `.env.test` (loaded via `vitest.setup.ts`).
