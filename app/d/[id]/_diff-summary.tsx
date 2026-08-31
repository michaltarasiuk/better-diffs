import {Separator, tv, type VariantProps} from '@heroui/react';
import {Accordion} from '@heroui/react/accordion';
import {GitCompareIcon} from 'lucide-react';

import {formatDiffStat, type DiffStats} from '@/lib/diffs/stats';

export function DiffSummary({stats}: {readonly stats: DiffStats}) {
  return (
    <Accordion defaultExpandedKeys={['stats']}>
      <Accordion.Item id="stats">
        <Accordion.Heading>
          <Accordion.Trigger className="hover:bg-inherit">
            <GitCompareIcon className="text-muted me-3 size-4 shrink-0" />
            Diff Stats
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
  base: 'tabular-nums',
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
