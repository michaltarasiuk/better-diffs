import '@/lib/diffs/diffs.css';

import {Typography} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
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
    diff --git a/share.sh b/share.sh
    --- a/share.sh
    +++ b/share.sh
    @@ -1 +1,4 @@
    -git diff
    +better-diffs
    +better-diffs --staged
    +better-diffs --base main -- src/
    +better-diffs --open
  `,
  diffOptions: {
    ...DIFF_VIEWER_OPTIONS,
    diffStyle: 'unified',
    stickyHeader: false,
    overflow: 'wrap',
  } as const,
} as const;

export const metadata: Metadata = {
  description: DESCRIPTION,
};

export const dynamic = 'force-dynamic';

const sectionHeading = typographyVariants({
  type: 'body-xs',
  color: 'muted',
  weight: 'medium',
});

export default async function HomePage() {
  const preloadedPatchDiff = await preloadPatchDiff({
    patch: USAGE.patch,
    options: USAGE.diffOptions,
  });

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-10">
        <header className="space-y-2">
          <Typography type="h3" className="font-mono tracking-tight">
            better-diffs
          </Typography>

          <Typography type="body-sm" color="muted">
            {DESCRIPTION} They can view the diff and leave comments. Links
            expire one day after the last visit.
          </Typography>
        </header>

        <section aria-labelledby="install" className="space-y-2">
          <SectionHeading id="install">Install</SectionHeading>

          <div className="space-y-1">
            <CopyCommand
              command={INSTALL.command}
              label="Copy install command"
            />

            <Typography.Paragraph size="sm" color="muted">
              Downloads a prebuilt binary for macOS or Linux into{' '}
              <Typography.Code className="text-xs">
                {INSTALL.dir}
              </Typography.Code>{' '}
              and points it at this instance. Needs{' '}
              <Typography.Code className="text-xs">git</Typography.Code> to run.
            </Typography.Paragraph>
          </div>
        </section>

        <section aria-labelledby="usage">
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
      className={sectionHeading.base({
        className: 'tracking-wider uppercase',
      })}
    >
      {children}
    </h2>
  );
}
