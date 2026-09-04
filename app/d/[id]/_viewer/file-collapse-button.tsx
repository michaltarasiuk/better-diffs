'use client';

import {Button} from '@heroui/react';
import {ChevronRightIcon} from 'lucide-react';

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
      isIconOnly
      onPress={onToggle}
      size="sm"
      variant="ghost"
    >
      <ChevronRightIcon
        aria-hidden
        className={`size-4 transition-transform${collapsed ? '' : 'rotate-90'}`}
      />
    </Button>
  );
}
