import type {SerializedEditorState} from 'lexical';
import {use} from 'react';

import type {Session} from '@/auth/server';
import {openThread} from '@/events/actions';
import {toEventActor} from '@/events/actor';
import {ShareStateContext} from '@/events/provider';
import type {Anchor} from '@/events/schemas';
import {newId} from '@/utils/new-id';

import {useShareId} from './use-share-id';

type Position = Pick<Anchor, 'side' | 'filePath' | 'line'>;

export function useOpenThread() {
  const shareId = useShareId();
  const state = use(ShareStateContext);

  return async function (
    session: Session,
    position: Position,
    body: SerializedEditorState,
  ) {
    const threadId = newId();
    const commentId = newId();
    const anchor: Anchor = {shareId, ...position};
    const meta = {
      ...toEventActor(session),
      createdAt: new Date().toISOString(),
    };

    const pendingIds = state.optimisticAll([
      {
        ...meta,
        payload: {$type: 'thread.opened', threadId, anchor},
      },
      {
        ...meta,
        payload: {$type: 'comment.created', threadId, commentId, body},
      },
    ]);

    try {
      await openThread({shareId, threadId, commentId, body, anchor});
    } catch {
      state.rejectAll(pendingIds);
    }
  };
}
