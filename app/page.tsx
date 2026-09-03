import '@/lib/diffs/diffs.css';

import {PatchDiff} from '@pierre/diffs/react';
import dedent from 'dedent';

import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';
import {env} from '@/lib/env';

import {CopyCommand} from './_home/copy-command';

import type {Metadata} from 'next';

const USAGE_DIFF_OPTIONS = {
  ...DIFF_VIEWER_OPTIONS,
  diffStyle: 'unified',
} as const;

const DESCRIPTION =
  'Share your current changes with teammates without creating a PR.';

export const metadata: Metadata = {
  description: DESCRIPTION,
};

export const dynamic = 'force-dynamic';

const USAGE_PATCH = dedent`
  diff --git a/usage b/usage
  --- a/usage
  +++ b/usage
  @@ -1 +1,4 @@
   better-diffs
  +better-diffs --staged
  +better-diffs --base main -- src/
  +better-diffs --open
`;

const INSTALL_DIR = '~/.local/bin';

export default function HomePage() {
  const installCommand = dedent`
    BASE_URL='${env.BASE_URL}'
    curl -fsSL "$BASE_URL/install.sh" | sh
  `;

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
          <CopyCommand command={installCommand} label="Copy install command" />
          <p className="text-muted text-xs">
            Downloads a prebuilt binary for macOS or Linux into{' '}
            <InlineCode>{INSTALL_DIR}</InlineCode> and points it at this
            instance. Needs <InlineCode>git</InlineCode> to run.
          </p>
        </section>

        <section aria-labelledby="usage" className="flex flex-col gap-3">
          <SectionHeading id="usage">Usage</SectionHeading>
          <PatchDiff
            patch={USAGE_PATCH}
            options={USAGE_DIFF_OPTIONS}
            className="w-full"
          />
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
