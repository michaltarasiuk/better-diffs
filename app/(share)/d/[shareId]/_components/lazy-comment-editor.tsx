'use client';

import {type ComponentProps, lazy, Suspense} from 'react';

import {CommentEditorSkeleton} from './comment-editor-skeleton';

const CommentEditor = lazy(() =>
  import('./comment-editor').then((module) => ({
    default: module.CommentEditor,
  })),
);

export function LazyCommentEditor(props: ComponentProps<typeof CommentEditor>) {
  return (
    <Suspense
      fallback={
        <CommentEditorSkeleton
          variant={props.variant}
          className={props.className}
        />
      }
    >
      <CommentEditor {...props} />
    </Suspense>
  );
}

export function preloadCommentEditor() {
  void import('./comment-editor');
}
