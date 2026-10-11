'use client';

import {Input} from '@heroui/react';
import {useEffect, useState} from 'react';

import {useDismissOnEscape} from '../_hooks/use-dismiss-on-escape';
import {preloadCommentEditor} from './lazy-comment-editor';

interface ReplyInputProps {
  readonly children: (props: {onDismiss: () => void}) => React.ReactNode;
}

export function ReplyInput({children}: ReplyInputProps) {
  const [isEditing, setIsEditing] = useState(false);

  function onDismiss() {
    setIsEditing(false);
  }

  const focusWithinProps = useDismissOnEscape(onDismiss);

  useEffect(() => {
    preloadCommentEditor();
  }, []);

  if (!isEditing) {
    return (
      <div className="p-3">
        <Input
          aria-label="Write a reply"
          placeholder="Write a reply…"
          variant="secondary"
          fullWidth
          onFocus={() => setIsEditing(true)}
        />
      </div>
    );
  }

  return <div {...focusWithinProps}>{children({onDismiss})}</div>;
}
