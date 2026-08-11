#!/usr/bin/env bun

import {parseArgs} from 'node:util';
import dedent from 'dedent';
import {z} from 'zod';
import {parsePatchFiles} from '@pierre/diffs';

declare const __BETTER_DIFFS_BASE_URL__: string | undefined;

const ShareResponse = z.discriminatedUnion('ok', [
  z.object({ok: z.literal(true), id: z.string(), url: z.url()}),
  z.object({ok: z.literal(false), error: z.string()}),
]);

const {values: flags, positionals} = parseArgs({
  options: {
    staged: {type: 'boolean', default: false},
    base: {type: 'string'},
    open: {type: 'boolean', short: 'o', default: false},
    help: {type: 'boolean', short: 'h', default: false},
  },
  allowPositionals: true,
});

if (flags.help) {
  console.log(dedent`
    Create shareable links for code diffs

    USAGE
      $ better-diffs [options] [-- <path>...]

    OPTIONS
      --staged       Diff staged changes
      --base <ref>   Diff against a specific ref
      --open, -o     Open URL in browser
      --help, -h     Show this help

    EXAMPLES
      $ better-diffs
      $ better-diffs --staged --open
      $ better-diffs --base main -- src/
  `);
  process.exit(0);
}

const args = ['git', 'diff', flags.base].filter(
  (value): value is string => value != null,
);
if (flags.staged) {
  args.push('--staged');
}
args.push(...positionals);

const {stdout, stderr, exitCode} = Bun.spawnSync(args);
if (exitCode !== 0) {
  const message = String(stderr);
  throw message
    ? `git diff failed: ${message}`
    : `git diff failed (exit ${exitCode})`;
}

const diff = String(stdout);
if (!diff) {
  throw 'No changes found';
}

const patches = parsePatchFiles(diff).map((p) => p.files);

const response = await fetch(`${__BETTER_DIFFS_BASE_URL__}/api/diffs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    patches,
  }),
});

const shared = ShareResponse.parse(await response.json());
if (shared.ok) {
  console.log(shared.url);
} else {
  throw `Upload failed: ${shared.error}`;
}

if (flags.open) {
  let cmd: string;
  switch (process.platform) {
    case 'darwin':
      cmd = 'open';
      break;
    case 'win32':
      cmd = 'start';
      break;
    case 'linux':
      cmd = 'xdg-open';
      break;
    default:
      throw `Unsupported platform: ${process.platform}`;
  }
  Bun.spawn([cmd, shared.url]);
}
