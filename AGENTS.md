<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Testing

Use `.agents/skills/vitest/SKILL.md` for Vitest API and config.

Vitest uses a `node` environment by default. Add `// @vitest-environment jsdom` when a test renders components or hooks. Name real browser API tests `*.browser.test.ts` or `*.browser.test.tsx`; Vitest runs them in the `browser` project, not a polyfill.

Colocate tests as `*.test.ts`, `*.test.tsx`, or `*.browser.test.ts` beside the module under test. Prefer calling handlers and plain functions directly over starting a server. Mock dependencies at the import boundary with `vi.mock`. Test env vars live in `.env.test`.

Build test data with `create*` factories from `@/testkit/{domain}`. Factories mint a fresh id per call — wire relationships explicitly and reuse the same payload object when optimistic and confirmed twins must match. Use `uuid()` from `@/testkit/uuid` for deliberately unknown ids. Keep helpers used by a single test file local to that file.

Vitest clears mock call history (`clearMocks`), restores `vi.spyOn` spies (`restoreMocks`), and unstubs globals (`unstubGlobals`) automatically. Do not call `mockClear`, `mockReset`, or `restoreAllMocks` for that. Hoist bare `vi.fn()` mocks, put default return values in `beforeEach` when a test may override them, and keep permanent mock behavior (such as throwing) in the hoisted factory.

Type hoisted mocks for module exports with `typeof import('…').name` so signatures stay in sync with production code; do not hand-write parameter or return types. Leave inline `vi.fn()` untyped for local callbacks and browser APIs that have no module export.

## Commit messages

Use imperative mood, sentence case, no trailing period. Start with a capital verb, lowercase the rest unless a proper noun.

## Error messages

Follow the style used in [inlay](https://tangled.org/danabra.mov/inlay): sentence case with a leading capital, no trailing period, no `Error:` prefix. State what is wrong rather than what the caller should have done (`Thread already resolved: ${threadId}`, not `You cannot resolve this twice`). Throw with `new Error(\`…\`)` at the call site; do not wrap messages in helpers.

When a message names a record, append the identifier after a colon. Omit the suffix only when there is nothing useful to attach:

| Situation              | Pattern                           | Example                                 |
| ---------------------- | --------------------------------- | --------------------------------------- |
| Missing record         | `<Entity> not found: ${id}`       | `Comment not found: ${commentId}`       |
| Duplicate record       | `<Entity> already exists: ${id}`  | `Thread already exists: ${threadId}`    |
| Record in wrong state  | `<Entity> already <state>: ${id}` | `Comment already deleted: ${commentId}` |
| Bad field or reference | `Invalid <field>: ${id}`          | `Invalid event seq: ${event.seq}`       |
| Bad whole input        | `Invalid <input>`                 | `Invalid open thread input`             |

API responses use the same casing as a noun phrase describing the rejected input (`Invalid patches`, `Unauthorized`) because the text reaches the client verbatim.

Errors constructed as test fixtures are opaque values, not messages, so they need none of this.

## React state

Name functional `setState` updater parameters from the state variable:
first letter for a single word (`setNumber(n => …)`), first letters of
each camelCase segment otherwise (`setLastName(ln => …)`). See
https://react.dev/learn/queueing-a-series-of-state-updates#naming-conventions

## Comments

Only comment to record a constraint the code cannot show: an upstream quirk, a browser difference, a non-obvious ordering requirement. Never narrate what the code does, and never explain a change you just made.

Always use block form: `/** … */` on an exported symbol so the note surfaces on hover at call sites, `/* … */` everywhere else. Open and close on their own lines, align a leading asterisk under the first one on every continuation line, wrap at 80 columns, and write full sentences. Lead with the external constraint, then the workaround it forces.

Tool directives (`@type`, `@__PURE__`, `/// <reference>`) are exempt; leave them in whatever form the tool requires.
