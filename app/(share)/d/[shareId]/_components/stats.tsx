import {Accordion, Separator, tv, type VariantProps} from '@heroui/react';

import {type DiffStats as DiffStatsData, formatDiffStat} from '@/diffs/stats';

export function Stats({stats}: {readonly stats: DiffStatsData}) {
  return (
    <Accordion defaultExpandedKeys={['stats']}>
      <Accordion.Item id="stats">
        <Accordion.Heading>
          <Accordion.Trigger className="hover:bg-inherit">
            Stats
            <Accordion.Indicator />
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body>
            <dl>
              <Stat label="Files" value={stats.files} />
              <Separator />
              <Stat label="Additions" value={stats.additions} tone="success" />
              <Separator />
              <Stat label="Deletions" value={stats.deletions} tone="danger" />
              <Separator />
              <Stat label="Lines" value={stats.lines} />
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
    <div className="flex items-center justify-between py-1 text-xs">
      <dt className="text-muted">{label}</dt>
      <dd className={statValue({tone})}>{formatDiffStat(value)}</dd>
    </div>
  );
}

const statValue = tv({
  base: 'tabular-nums text-foreground',
  variants: {
    tone: {
      default: null,
      success: 'text-success',
      danger: 'text-danger',
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});
