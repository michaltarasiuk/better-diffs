import '@/lib/diffs/diffs.css';

import {Typography} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {PatchDiff} from '@pierre/diffs/react';
import {preloadPatchDiff} from '@pierre/diffs/ssr';
import dedent from 'dedent';

import {PATCH_DIFF_OPTIONS} from '@/lib/diffs/options';
import {env} from '@/lib/env';

import {CopyCommand} from './_home/copy-command';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const preloadedPatchDiff = await preloadPatchDiff({
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
    options: PATCH_DIFF_OPTIONS,
  });

  return (
    <main className="mx-auto h-full max-w-2xl space-y-10 px-6 py-12 sm:space-y-12 sm:px-8 sm:py-16">
      <header className="space-y-3">
        <Typography.Heading level={1} className={heading.base()}>
          better-diffs
        </Typography.Heading>

        <Typography.Paragraph color="muted">
          Share your current changes with teammates without creating a PR. They
          can view the diff and leave comments. Links expire one day after the
          last visit.
        </Typography.Paragraph>
      </header>

      <section aria-labelledby="install" className="space-y-3">
        <Typography.Heading
          id="install"
          level={2}
          className={sectionHeading.base()}
        >
          Install
        </Typography.Heading>

        <div className="space-y-2">
          <CopyCommand
            label="Copy install command"
            command={dedent`
              BASE_URL='${env.BASE_URL}'
              curl -fsSL "$BASE_URL/install.sh" | sh
            `}
          />

          <Typography.Paragraph size="sm" color="muted">
            {[
              'Downloads a prebuilt binary for macOS or Linux into ',
              <Typography.Code key="bin">~/.local/bin</Typography.Code>,
              ' and points it at this instance. Needs ',
              <Typography.Code key="git">git</Typography.Code>,
              ' to run.',
            ]}
          </Typography.Paragraph>
        </div>
      </section>

      <section aria-labelledby="usage" className="space-y-3">
        <Typography.Heading
          id="usage"
          level={2}
          className={sectionHeading.base()}
        >
          Usage
        </Typography.Heading>

        <PatchDiff {...preloadedPatchDiff} className="w-full" />
      </section>
    </main>
  );
}

const heading = typographyVariants({
  type: 'h1',
  className: 'font-mono tracking-tight',
});

const sectionHeading = typographyVariants({
  type: 'h6',
});
