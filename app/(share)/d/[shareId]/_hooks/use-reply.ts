import type {SerializedEditorState} from 'lexical';
import {use} from 'react';

import type {Session} from '@/auth/server';
import {createComment as replyAction} from '@/events/actions';
import {toEventActor} from '@/events/actor';
import {ShareStateContext} from '@/events/provider';
import {newId} from '@/utils/new-id';

import {useShareId} from './use-share-id';

export function useReply() {
  const shareId = useShareId();
  const state = use(ShareStateContext);

  async function reply(
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
      await replyAction({
        shareId,
        threadId,
        commentId,
        body,
      });
      return true;
    } catch {
      state.reject(pendingId);
      return false;
    }
  }

  return reply;
}
