import '@/lib/diffs/diffs.css';

import {PatchDiff} from '@pierre/diffs/react';
import {preloadPatchDiff} from '@pierre/diffs/ssr';
import dedent from 'dedent';

import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';
import {env} from '@/lib/env';

import {CopyCommand} from './_home/copy-command';

import type {Metadata} from 'next';

const DESCRIPTION =
  'Share your current changes with teammates without creating a PR.';

const INSTALL = {
  dir: '~/.local/bin',
  command: dedent`
    BASE_URL='${env.BASE_URL}'
    curl -fsSL "$BASE_URL/install.sh" | sh
  `,
} as const;

const USAGE = {
  patch: dedent`
    diff --git a/usage b/usage
    --- a/usage
    +++ b/usage
    @@ -1 +1,4 @@
     better-diffs
    +better-diffs --staged
    +better-diffs --base main -- src/
    +better-diffs --open
  `,
  diffOptions: {
    ...DIFF_VIEWER_OPTIONS,
    diffStyle: 'unified',
  } as const,
} as const;

export const metadata: Metadata = {
  description: DESCRIPTION,
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const preloadedPatchDiff = await preloadPatchDiff({
    patch: USAGE.patch,
    options: USAGE.diffOptions,
  });

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="flex w-full max-w-2xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">
            better-diffs
          </h1>
          <p className="text-muted text-sm">
            {DESCRIPTION} They can view the diff and leave comments. Links
            expire one day after the last visit.
          </p>
        </header>

        <section aria-labelledby="install" className="flex flex-col gap-3">
          <SectionHeading id="install">Install</SectionHeading>
          <CopyCommand command={INSTALL.command} label="Copy install command" />
          <p className="text-muted text-xs">
            Downloads a prebuilt binary for macOS or Linux into{' '}
            <InlineCode>{INSTALL.dir}</InlineCode> and points it at this
            instance. Needs <InlineCode>git</InlineCode> to run.
          </p>
        </section>

        <section aria-labelledby="usage" className="flex flex-col gap-3">
          <SectionHeading id="usage">Usage</SectionHeading>
          <PatchDiff {...preloadedPatchDiff} className="w-full" />
        </section>
      </div>
    </main>
  );
}

interface SectionHeadingProps {
  readonly id: string;
  readonly children: React.ReactNode;
}

function SectionHeading({id, children}: SectionHeadingProps) {
  return (
    <h2
      id={id}
      className="text-muted text-xs font-medium tracking-wider uppercase"
    >
      {children}
    </h2>
  );
}

function InlineCode({children}: {readonly children: React.ReactNode}) {
  return (
    <code className="bg-surface-secondary rounded-sm px-1 py-0.5 font-mono">
      {children}
    </code>
  );
}
