import {Accordion, tv, type VariantProps} from '@heroui/react';
import {fbs} from 'fbtee';

import {formatDiffStat, type DiffStats} from '#/diffs/stats';

export function Stats({stats}: {readonly stats: DiffStats}) {
  return (
    <Accordion
      defaultExpandedKeys={['stats']}
      className="border-t border-border bg-trees-sidebar"
    >
      <Accordion.Item id="stats">
        <Accordion.Heading>
          <Accordion.Trigger className="px-4 py-3 text-xs font-medium text-muted hover:bg-inherit">
            <fbt desc="Heading of the diff statistics panel">Stats</fbt>
            <Accordion.Indicator className="size-3.5" />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="px-4 pt-0 pb-3">
            <dl className="space-y-1.5">
              <Stat
                label={fbs('Files', 'Statistic: number of changed files')}
                value={stats.files}
              />
              <Stat
                label={fbs('Additions', 'Statistic: number of added lines')}
                value={stats.additions}
                tone="success"
              />
              <Stat
                label={fbs('Deletions', 'Statistic: number of deleted lines')}
                value={stats.deletions}
                tone="danger"
              />
              <Stat
                label={fbs('Lines', 'Statistic: number of changed lines')}
                value={stats.lines}
              />
            </dl>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

interface StatProps extends VariantProps<typeof statValue> {
  readonly label: string;
  readonly value: number;
}

function Stat({label, value, tone}: StatProps) {
  return (
    <div className="flex items-center justify-between text-xs">
      <dt className="text-muted">{label}</dt>
      <dd className={statValue({tone})}>{formatDiffStat(value)}</dd>
    </div>
  );
}

const statValue = tv({
  base: 'tabular-nums text-foreground',
  variants: {
    tone: {
      default: undefined,
      success: 'text-success',
      danger: 'text-danger',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});
