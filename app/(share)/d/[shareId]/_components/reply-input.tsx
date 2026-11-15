'use client';

import {inputVariants} from '@heroui/styles';
import {useEffect, useState} from 'react';
import {Button} from 'react-aria-components';

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
        <Button
          className={inputVariants({
            variant: 'secondary',
            fullWidth: true,
            className: 'cursor-text text-start text-field-placeholder',
          })}
          onPress={() => setIsEditing(true)}
        >
          <fbt desc="Collapsed reply field under a comment thread">
            Write a reply…
          </fbt>
        </Button>
      </div>
    );
  }

  return <div {...focusWithinProps}>{children({onDismiss})}</div>;
}
