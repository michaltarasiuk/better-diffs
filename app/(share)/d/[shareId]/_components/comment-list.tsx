'use client';

import {Fragment, useState} from 'react';

import {Avatar, Separator} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import type {SerializedEditorState} from 'lexical';
import {defineExtension} from 'lexical';

import type {CommentState} from '@/events/state';
import {EDITOR_THEME} from '@/lexical/editor-theme';
import {isDefined} from '@/utils/is-defined';

interface CommentListProps {
  readonly comments: readonly CommentState[];
}

export function CommentList({comments}: CommentListProps) {
  const lastIndex = comments.length - 1;

  return (
    <div className="space-y-0">
      {comments.map((comment, index) => (
        <Fragment key={comment.id}>
          <Comment comment={comment} />

          {index < lastIndex && (
            <div className="mx-3">
              <Separator />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

interface CommentProps {
  readonly comment: CommentState;
}

export function Comment({comment}: CommentProps) {
  return (
    <div className="flex gap-3 p-3">
      <Avatar size="sm">
        {isDefined(comment.actor.image) ? (
          <Avatar.Image src={comment.actor.image} alt={comment.actor.name} />
        ) : null}
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={typographyVariants({type: 'body-sm'}).base({
            className: 'font-medium',
          })}
        >
          {comment.actor.name}
        </p>

        <CommentBody initialState={comment.body} />
      </div>
    </div>
  );
}

interface CommentBodyProps {
  readonly initialState: SerializedEditorState;
}

function CommentBody({initialState}: CommentBodyProps) {
  const [extension] = useState(() =>
    defineExtension({
      name: '@better-diffs/comment-body',
      namespace: 'CommentBody',
      theme: EDITOR_THEME,
      dependencies: [RichTextExtension],
      editable: false,
      $initialEditorState: JSON.stringify(initialState),
      onError(error) {
        console.error(error);
      },
    }),
  );

  return (
    <LexicalExtensionComposer extension={extension} contentEditable={null}>
      <ContentEditable aria-label="Comment" />
    </LexicalExtensionComposer>
  );
}
