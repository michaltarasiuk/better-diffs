import {Button, type ButtonProps} from '@heroui/react';
import {PlusIcon} from 'lucide-react';

import {preloadCommentEditor} from './lazy-comment-editor';

export function AddCommentButton(props: ButtonProps) {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      onHoverStart={preloadCommentEditor}
      onFocus={preloadCommentEditor}
      isIconOnly
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
      {...props}
    >
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}
