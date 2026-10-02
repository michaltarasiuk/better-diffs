'use client';

import {useState} from 'react';
import {Input} from '@heroui/react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {useKeyDown} from '@/hooks/use-key-down';
import {Editor, type OnComment} from './editor';

interface ReplyInputProps {
  readonly onComment?: OnComment;
}

export function ReplyInput({onComment}: ReplyInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      setIsFocusWithin(isFocusWithin);
    },
  });

  useKeyDown((event) => {
    if (event.key === 'Escape' && isFocusWithin && isEditing) {
      setIsEditing(false);
    }
  });

  if (isEditing) {
    return (
      <div {...focusWithinProps}>
        <Editor
          placeholder="Write a reply…"
          autoFocus
          variant="secondary"
          className="rounded-b-xl"
          onComment={onComment}
          onDismiss={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <Input
      aria-label="Write a reply"
      placeholder="Write a reply…"
      variant="secondary"
      fullWidth
      onFocus={() => setIsEditing(true)}
    />
  );
}
