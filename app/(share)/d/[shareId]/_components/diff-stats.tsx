import {Accordion, Separator, tv, type VariantProps} from '@heroui/react';

import {type DiffStats as DiffStatsData, formatDiffStat} from '@/diffs/stats';

export function DiffStats({stats}: {readonly stats: DiffStatsData}) {
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
              <DiffStat label="Files" value={stats.files} />
              <Separator />
              <DiffStat
                label="Additions"
                value={stats.additions}
                tone="success"
              />
              <Separator />
              <DiffStat
                label="Deletions"
                value={stats.deletions}
                tone="danger"
              />
              <Separator />
              <DiffStat label="Lines" value={stats.lines} />
            </dl>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

interface DiffStatProps extends VariantProps<typeof diffStatValue> {
  readonly label: string;
  readonly value: number;
}

function DiffStat({label, value, tone}: DiffStatProps) {
  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <dt className="text-muted">{label}</dt>
      <dd className={diffStatValue({tone})}>{formatDiffStat(value)}</dd>
    </div>
  );
}

const diffStatValue = tv({
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
