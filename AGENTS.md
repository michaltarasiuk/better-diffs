<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit messages

Use imperative mood, sentence case, no trailing period. Start with a capital verb, lowercase the rest unless a proper noun.

## Comments

Only comment to record a constraint the code cannot show — an upstream quirk, a browser difference, a non-obvious ordering requirement. Never narrate what the code does, and never explain a change you just made.

Always use block form: `/** … */` on an exported symbol so the note surfaces on hover at call sites, `/* … */` everywhere else. Open and close on their own lines, align a leading asterisk under the first one on every continuation line, wrap at 80 columns, and write full sentences. Lead with the external constraint, then the workaround it forces.

Tool directives (`@type`, `@__PURE__`, `/// <reference>`) are exempt; leave them in whatever form the tool requires.
