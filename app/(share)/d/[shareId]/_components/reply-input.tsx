'use client';

import {Input} from '@heroui/react';
import type {SerializedEditorState} from 'lexical';
import {use, useState} from 'react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import type {Session} from '@/auth/client';
import {SessionContext} from '@/auth/context';
import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';

import {Editor} from './editor';

interface ReplyInputProps {
  readonly signIn: (props: {onDismiss: () => void}) => React.ReactNode;
  readonly initialState?: SerializedEditorState;
  readonly onReply?: (
    body: SerializedEditorState,
    session: Session,
  ) => void | Promise<unknown>;
  readonly onChange?: (draft: SerializedEditorState) => void;
}

export function ReplyInput({
  signIn,
  initialState,
  onReply,
  onChange,
}: ReplyInputProps) {
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
          initialState={initialState}
          variant="transparent"
          className="rounded-b-xl"
          onComment={(body) => onReply?.(body, session)}
          onChange={onChange}
          onDismiss={onDismiss}
        />
      ) : (
        signIn({onDismiss})
      )}
    </div>
  );
}
