import {Button, type ButtonProps} from '@heroui/react';
import {fbs} from 'fbtee';
import {PlusIcon} from 'lucide-react';

import {preloadCommentEditor} from './lazy-comment-editor';

export function AddCommentButton(props: ButtonProps) {
  return (
    <Button
      id="gutter-utility"
      aria-label={fbs(
        'Add comment',
        'Gutter button that starts a comment on a line',
      )}
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
