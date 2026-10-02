'use client';

import {use, useState} from 'react';
import {Input} from '@heroui/react';
import type {SerializedEditorState} from 'lexical';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import type {Session} from '@/auth/auth';
import {SessionContext} from '@/auth/context';
import {Editor} from './editor';

interface ReplyInputProps {
  readonly signIn: (props: {onDismiss: () => void}) => React.ReactNode;
  readonly onReply?: (
    body: SerializedEditorState,
    session: Session,
  ) => void | Promise<unknown>;
}

export function ReplyInput({signIn, onReply}: ReplyInputProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      setIsFocusWithin(isFocusWithin);
    },
  });

  const session = use(SessionContext);

  function onDismiss() {
    setIsEditing(false);
  }

  useKeyDown((event) => {
    if (event.key === 'Escape' && isFocusWithin && isEditing) {
      onDismiss();
    }
  });

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

  return (
    <div {...focusWithinProps}>
      {isDefined(session) ? (
        <Editor
          placeholder="Write a reply…"
          autoFocus
          variant="secondary"
          className="rounded-b-xl"
          onComment={(body) => onReply?.(body, session)}
          onDismiss={onDismiss}
        />
      ) : (
        signIn({onDismiss})
      )}
    </div>
  );
}
