'use client';

import {useState} from 'react';
import {Input} from '@heroui/react';

import type {OnComment} from './editor';
import {Editor} from './editor';

export interface ReplyInputProps {
  readonly onComment?: OnComment;
}

export function ReplyInput({onComment}: ReplyInputProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Editor
        placeholder="Write a reply…"
        variant="secondary"
        autoFocus
        onComment={onComment}
        onDismiss={() => setIsEditing(false)}
      />
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
