import type {SerializedEditorState} from 'lexical';
import {use} from 'react';

import type {Session} from '@/auth/server';
import {createComment} from '@/events/actions';
import {toEventActor} from '@/events/actor';
import {ShareStateContext} from '@/events/provider';
import {newId} from '@/utils/new-id';

import {useShareId} from './use-share-id';

export function useReply() {
  const shareId = useShareId();
  const state = use(ShareStateContext);

  return async function (
    session: Session,
    threadId: string,
    body: SerializedEditorState,
  ) {
    const commentId = newId();

    const pendingId = state.optimistic({
      ...toEventActor(session),
      createdAt: new Date().toISOString(),
      payload: {$type: 'comment.created', threadId, commentId, body},
    });

    try {
      await createComment({shareId, threadId, commentId, body});
      return true;
    } catch {
      state.reject(pendingId);
      return false;
    }
  };
}
