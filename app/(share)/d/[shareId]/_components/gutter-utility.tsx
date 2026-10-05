import type {ButtonProps} from '@heroui/react';
import {Button} from '@heroui/react';
import {PlusIcon} from 'lucide-react';

export function GutterUtility(props: ButtonProps) {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      onHoverStart={preloadEditor}
      onFocus={preloadEditor}
      isIconOnly
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
      {...props}
    >
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}

function preloadEditor() {
  void import('./editor');
}
