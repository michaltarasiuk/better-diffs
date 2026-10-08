<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide

This guide collects repository conventions for agents and humans maintaining
better-diffs. It is normative for generated and edited code unless a more
specific skill or module doc overrides it.

### Terminology notes

This guide uses RFC 2119 terminology when using the phrases must, must not,
should, should not, and may. The terms prefer and avoid correspond to should
and should not, respectively. Imperative and declarative statements are
prescriptive and correspond to must.

### Guide notes

Examples are non-normative and illustrate the rules only. Optional choices
shown in examples must not be enforced as additional rules.

## Testing

Use `.agents/skills/vitest/SKILL.md` for Vitest API and configuration details.

### Environments

Vitest uses a `node` environment by default. Files that render components or
hooks must opt into jsdom with a file directive:

```ts
// @vitest-environment jsdom
```

Real browser API tests must be named `*.browser.test.ts` or
`*.browser.test.tsx`. Vitest runs them in the `browser` project, not a
polyfill.

### File layout

Tests must be colocated beside the module under test as `*.test.ts`,
`*.test.tsx`, or `*.browser.test.ts`.

Prefer calling route handlers and plain functions directly over starting a
server. Mock dependencies at the import boundary with `vi.mock`. Test
environment variables live in `.env.test`.

### Test data

Build fixtures with `create*` helpers from `@/testing/{domain}`. Helpers mint a
fresh id per call; wire relationships explicitly and reuse the same payload
object when optimistic and confirmed twins must match. Use `uuid()` from
`@/testing/uuid` for deliberately unknown ids. Helpers used by a single test
file should stay local to that file.

### Mocks

Vitest clears mock call history (`clearMocks`), restores `vi.spyOn` spies
(`restoreMocks`), and unstubs globals (`unstubGlobals`) automatically. Do not
call `mockClear`, `mockReset`, or `restoreAllMocks` for that behavior.

Hoist bare `vi.fn()` mocks. Put default return values in `beforeEach` when a
test may override them. Keep permanent mock behavior (such as throwing) in the
hoisted factory.

Type hoisted mocks for module exports with `typeof import('…').name` so
signatures stay in sync with production code; do not hand-write parameter or
return types. Leave inline `vi.fn()` untyped for local callbacks and browser
APIs that have no module export.

## Commit messages

Commit messages must use imperative mood, sentence case, and no trailing
period. Start with a capital verb; lowercase the rest unless a proper noun.

## Error messages

### General form

Error strings must use sentence case with a leading capital, no trailing
period, and no `Error:` prefix. State what is wrong rather than instructing the
caller (`Thread already resolved: ${threadId}`, not `You cannot resolve this
twice`).

Throw with `new Error(\`…\`)` at the call site; do not wrap messages in
helpers.

### Record identifiers

When a message names a record, append the identifier after a colon. Omit the
suffix only when there is nothing useful to attach:

| Situation              | Pattern                           | Example                                 |
| ---------------------- | --------------------------------- | --------------------------------------- |
| Missing record         | `<Entity> not found: ${id}`       | `Comment not found: ${commentId}`       |
| Duplicate record       | `<Entity> already exists: ${id}`  | `Thread already exists: ${threadId}`    |
| Record in wrong state  | `<Entity> already <state>: ${id}` | `Comment already deleted: ${commentId}` |
| Bad field or reference | `Invalid <field>: ${id}`          | `Invalid event seq: ${event.seq}`       |
| Bad whole input        | `Invalid <input>`                 | `Invalid open thread input`             |

### API responses

API responses use the same casing as a noun phrase describing the rejected
input (`Invalid patches`, `Unauthorized`) because the text reaches the client
verbatim.

### Tests

Errors constructed as test fixtures are opaque values, not messages; they need
none of the rules above.

## React state

Functional `setState` updater parameters must be named from the state
variable: first letter for a single word (`setNumber(n => …)`), first letters
of each camelCase segment otherwise (`setLastName(ln => …)`). See
https://react.dev/learn/queueing-a-series-of-state-updates#naming-conventions.

## Comments

Comments must record a constraint the code cannot show: an upstream quirk, a
browser difference, a non-obvious ordering requirement. Avoid comments that
only narrate what the code does or explain a change you just made.

#### JSDoc versus comments

There are two types of comments, JSDoc (`/** … */`) and ordinary implementation
comments (`// …`).

- Use `/** JSDoc */` on an exported symbol so the note surfaces on hover at
  call sites.
- Use `//` for implementation comments, including multi-line notes at the
  same indent as the surrounding code.

JSDoc is for readers of the API; implementation comments are for maintainers
of the file.

#### JSDoc general form

JSDoc on exported symbols must open and close on their own lines. Align a
leading asterisk under the first on every continuation line, wrap at 80
columns, and write full sentences. Lead with the external constraint, then the
workaround it forces.

```ts
/**
 * Browsers throw QuotaExceededError when storage is disabled, so treat the
 * error as "full" only when something is already stored.
 */
export function isStorageAvailable(type: StorageType) { … }
```

#### Multi-line comments

Multi-line implementation comments must use multiple single-line comments
(`//`-style), not block comment style (`/* */`).

```ts
// This is
// fine
```

```ts
/*
 * Do not use block comments for implementation notes.
 */
```

#### Comments when calling a function

Parameter-name comments should be used whenever the method name and parameter
value do not sufficiently convey the meaning of the parameter.

Before adding these comments, consider refactoring the method to accept an
interface or options object and destructure it instead.

Parameter-name comments go before the parameter value and include the parameter
name and a `=` suffix:

```ts
someFunction(obviousParam, /* shouldRender= */ true, /* name= */ 'hello');
```

Existing code may use a legacy parameter-name comment style, which places these
comments after the parameter value and omits the `=`. Continuing to use that
style within the file for consistency is acceptable.

```ts
someFunction(obviousParam, true /* shouldRender */, 'hello' /* name */);
```

#### Tool directives

Tool directives (`@type`, `@__PURE__`, `/// <reference>`) are exempt from the
rules above; leave them in whatever form the tool requires.
