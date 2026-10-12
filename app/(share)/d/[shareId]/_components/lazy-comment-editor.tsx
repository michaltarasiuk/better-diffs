'use client';

import dynamic from 'next/dynamic';

import {CommentEditorSkeleton} from './comment-editor-skeleton';

export const LazyCommentEditor = dynamic(
  () => import('./comment-editor').then((module) => module.CommentEditor),
  {loading: () => <CommentEditorSkeleton />},
);

export function preloadCommentEditor() {
  void import('./comment-editor');
}
