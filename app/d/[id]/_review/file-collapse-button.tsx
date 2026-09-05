import {Button, cn} from '@heroui/react';
import {ChevronDownIcon} from 'lucide-react';

interface FileCollapseButtonProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

export function FileCollapseButton({
  collapsed,
  onToggle,
}: FileCollapseButtonProps) {
  return (
    <Button
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand file' : 'Collapse file'}
      variant="ghost"
      size="sm"
      isIconOnly
      onPress={onToggle}
      className="size-7 min-w-7 shrink-0"
    >
      <ChevronDownIcon
        aria-hidden
        className={cn(
          'size-4 shrink-0 transition-transform',
          collapsed && '-rotate-90',
        )}
      />
    </Button>
  );
}
