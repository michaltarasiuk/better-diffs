import '@/diffs/diffs.css';

import {Typography} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {PatchDiff} from '@pierre/diffs/react';
import {preloadPatchDiff} from '@pierre/diffs/ssr';
import dedent from 'dedent';

import {PATCH_DIFF_OPTIONS} from '@/diffs/options';

import {CommandSnippet} from './_components/command-snippet';
import {INSTALL_COMMAND} from './_lib/install-command';

const HOME_PATCH = dedent`
  diff --git a/share.sh b/share.sh
  --- a/share.sh
  +++ b/share.sh
  @@ -1 +1,4 @@
  -git diff
  +better-diffs
  +better-diffs --staged
  +better-diffs --base main -- src/
  +better-diffs --open
`;

const {base: typographyClass} = typographyVariants();

const heroTitleClass = typographyClass({
  type: 'h2',
  className: 'font-mono tracking-tight',
});
const sectionTitleClass = typographyClass({
  type: 'h6',
});

export default async function HomePage() {
  const preloaded = await preloadPatchDiff({
    patch: HOME_PATCH,
    options: PATCH_DIFF_OPTIONS,
  });

  return (
    <main className="mx-auto h-full max-w-2xl space-y-10 px-6 py-12 sm:px-8 sm:py-16">
      <header className="space-y-3">
        <Typography.Heading level={1} className={heroTitleClass}>
          Better Diffs
        </Typography.Heading>

        <Typography.Paragraph size="sm" color="muted" className="max-w-prose">
          Share your current changes with teammates without creating a PR. They
          can view the diff and leave comments.
        </Typography.Paragraph>
      </header>

      <section aria-labelledby="install" className="space-y-3">
        <Typography.Heading
          id="install"
          level={2}
          className={sectionTitleClass}
        >
          Install
        </Typography.Heading>

        <div className="space-y-2">
          <CommandSnippet
            label="Copy install command"
            command={INSTALL_COMMAND}
          />

          <Typography.Paragraph size="xs" color="muted">
            Downloads a prebuilt binary for macOS or Linux into{' '}
            <Typography.Code className="text-xs leading-5">
              ~/.local/bin
            </Typography.Code>{' '}
            and points it at this instance. Needs{' '}
            <Typography.Code className="text-xs leading-5">git</Typography.Code>{' '}
            to run.
          </Typography.Paragraph>
        </div>
      </section>

      <section aria-labelledby="usage" className="space-y-3">
        <Typography.Heading id="usage" level={2} className={sectionTitleClass}>
          Usage
        </Typography.Heading>

        <PatchDiff {...preloaded} className="w-full" />
      </section>
    </main>
  );
}
