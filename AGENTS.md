<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide

If `.agents/skills/` or a comment in the file you're editing says something different, follow that.

## Comments

Comment when the code can't show the constraint: upstream behavior, browser differences, ordering that types don't make obvious. Don't restate the code or describe the diff.

Exports: `/** JSDoc */`. Implementation: `//` only, including multi-line notes (no `/* */` blocks). Unclear arguments: options object, or `/* name= */` before the value. Some files put the comment after the value; match the file. Tool directives (`@type`, `@__PURE__`, `/// <reference>`) stay as the tool expects.

## React state

Functional updaters: shorten the state name (`setNumber(n => …)`, `setLastName(ln => …)`). See [React's naming note](https://react.dev/learn/queueing-a-series-of-state-updates#naming-conventions).

## Tests

Colocate `*.test.ts`, `*.test.tsx`, and `*.browser.test.ts(x)` next to the code.

React and hooks: `// @vitest-environment jsdom` at the top of the file. Use `*.browser.test.*` when jsdom is not enough.

Fixtures: `create*` helpers from `@/testing/{domain}`, new id on each call. `uuid()` from `@/testing/uuid` for ids that must not exist in fixtures.

`vi.mock` at import boundaries. Hoist bare `vi.fn()`. Type module mocks as `typeof import('…').exportName`. Do not call `mockClear`, `mockReset`, or `restoreAllMocks` for ordinary cleanup.

Matchers and config: `.agents/skills/vitest/SKILL.md`.

## Errors

For thrown errors and JSON `error` fields clients see. Opaque error values in test fixtures are exempt.

Sentence case, capital first letter, no trailing period, no `Error:` prefix. Say what went wrong. Throw with `new Error(\`…\`)`at the call site. Add`: ${id}` when a record id helps.

| Situation   | Pattern                           | Example                                 |
| ----------- | --------------------------------- | --------------------------------------- |
| Missing     | `<Entity> not found: ${id}`       | `Comment not found: ${commentId}`       |
| Duplicate   | `<Entity> already exists: ${id}`  | `Thread already exists: ${threadId}`    |
| Wrong state | `<Entity> already <state>: ${id}` | `Comment already deleted: ${commentId}` |
| Bad field   | `Invalid <field>: ${id}`          | `Invalid event seq: ${event.seq}`       |
| Bad input   | `Invalid <input>`                 | `Invalid open thread input`             |

Use the same strings in API JSON (`Invalid patches`, `Unauthorized`).

## Commits

Imperative mood, sentence case, no trailing period.

Example: `Refactor selectNodeContents to drop return type annotation`
