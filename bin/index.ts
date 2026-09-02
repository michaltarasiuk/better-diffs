#!/usr/bin/env bun

import {parseArgs} from 'node:util';

import {parsePatchFiles} from '@pierre/diffs';
import dedent from 'dedent';
import {z} from 'zod';

import type {FileDiffMetadata} from '@pierre/diffs';

declare const __BETTER_DIFFS_BASE_URL__: string | undefined;

const CLI_HELP = dedent`
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
`;

try {
  const argv = process.argv.slice(2);
  const {flags, positionals} = parseCliArgs(argv);

  if (flags.help) {
    console.log(CLI_HELP);
  } else {
    const diff = getGitDiff({flags, positionals});

    const patches = parsePatchFiles(diff).map((patch) => patch.files);
    const shared = await uploadDiff(patches);

    console.log(shared.url);

    if (flags.open) {
      openUrl(shared.url);
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

function parseCliArgs(argv: readonly string[]) {
  const {
    values: {staged, base, open, help},
    positionals,
  } = parseArgs({
    args: [...argv],
    options: {
      staged: {type: 'boolean', default: false},
      base: {type: 'string'},
      open: {type: 'boolean', short: 'o', default: false},
      help: {type: 'boolean', short: 'h', default: false},
    },
    allowPositionals: true,
  });

  return {
    flags: {
      staged,
      base,
      open,
      help,
    },
    positionals,
  };
}

function getGitDiff({flags, positionals}: ReturnType<typeof parseCliArgs>) {
  const args = ['git', 'diff'];
  if (flags.base) {
    args.push(flags.base);
  }
  if (flags.staged) {
    args.push('--staged');
  }
  args.push(...positionals);

  const spawn = Bun.spawnSync(args);
  if (!spawn.success) {
    const command = args.join(' ');
    const stderr = String(spawn.stderr).trim();

    throw new Error(
      stderr
        ? `Failed to run \`${command}\`: ${stderr}`
        : `Failed to run \`${command}\` (exit code ${spawn.exitCode})`,
    );
  }

  const diff = String(spawn.stdout).trim();
  if (!diff) {
    throw new Error('No changes found');
  }

  return diff;
}

const CreateShareSuccess = z.object({
  ok: z.literal(true),
  id: z.string(),
  url: z.url(),
});

const CreateShareFailure = z.object({
  ok: z.literal(false),
  error: z.string(),
});

const CreateShareResponse = z.discriminatedUnion('ok', [
  CreateShareSuccess,
  CreateShareFailure,
]);

async function uploadDiff(patches: readonly (readonly FileDiffMetadata[])[]) {
  const response = await fetch(`${__BETTER_DIFFS_BASE_URL__}/api/diffs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({patches}),
  });

  const shared = CreateShareResponse.safeParse(await response.json());
  if (!shared.success) {
    throw new Error('Invalid response from server');
  }

  if (!shared.data.ok) {
    throw new Error(`Upload failed: ${shared.data.error}`);
  }

  return {
    id: shared.data.id,
    url: shared.data.url,
  };
}

function openUrl(url: string | URL) {
  Bun.spawn([getOpenCommand(process.platform), String(url)]);
}

function getOpenCommand(platform: NodeJS.Platform) {
  switch (platform) {
    case 'darwin':
      return 'open';
    case 'win32':
      return 'start';
    case 'linux':
      return 'xdg-open';
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
