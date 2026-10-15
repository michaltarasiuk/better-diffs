import '#/diffs/diffs.css';

import {Typography} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {MultiFileDiff} from '@pierre/diffs/react';
import {preloadMultiFileDiff} from '@pierre/diffs/ssr';

import {fileContents} from '#/diffs/contents';
import {PATCH_DIFF_OPTIONS} from '#/diffs/options';

import {CommandSnippet} from './_components/command-snippet';
import {INSTALL_COMMAND} from './_lib/install-command';

const USAGE_OLD_FILE = fileContents('share.sh', 'git diff');
const USAGE_NEW_FILE = fileContents(
  'share.sh',
  'better-diffs',
  'better-diffs --staged',
  'better-diffs --base main -- src/',
  'better-diffs --open',
);

const {base: typographyClass} = typographyVariants();

const heroTitleClass = typographyClass({
  type: 'h2',
  className: 'font-mono tracking-tight',
});
const sectionTitleClass = typographyClass({
  type: 'h6',
});

export default async function HomePage() {
  const preloaded = await preloadMultiFileDiff({
    oldFile: USAGE_OLD_FILE,
    newFile: USAGE_NEW_FILE,
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

      <Section id="install" title="Install">
        <div className="space-y-2">
          <CommandSnippet
            label="Copy install command"
            command={INSTALL_COMMAND}
          />

          <Typography.Paragraph size="xs" color="muted">
            Downloads a prebuilt binary for macOS or Linux into{' '}
            <InlineCode>~/.local/bin</InlineCode> and points it at this
            instance. Needs <InlineCode>git</InlineCode> to run.
          </Typography.Paragraph>
        </div>
      </Section>

      <Section id="usage" title="Usage">
        <MultiFileDiff {...preloaded} className="w-full" />
      </Section>
    </main>
  );
}

interface SectionProps {
  readonly id: string;
  readonly title: string;
  readonly children: React.ReactNode;
}

function Section({id, title, children}: SectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <Typography.Heading id={id} level={2} className={sectionTitleClass}>
        {title}
      </Typography.Heading>

      {children}
    </section>
  );
}

function InlineCode({children}: {readonly children: React.ReactNode}) {
  return (
    <Typography.Code className="text-xs leading-5">{children}</Typography.Code>
  );
}
