import type {Actor, Change, Comment, ShareSnapshot, Thread} from './schemas';

export interface ShareState {
  readonly revision: number;
  readonly threads: ReadonlyMap<string, Thread>;
  readonly comments: ReadonlyMap<string, Comment>;
}

export interface OptimisticChange {
  readonly actorId: string;
  readonly actor: Actor;
  readonly createdAt: string;
  readonly change: Change;
}

export function initialState({revision, threads, comments}: ShareSnapshot) {
  return {
    revision,
    threads: new Map(threads.map((thread) => [thread.id, thread])),
    comments: new Map(comments.map((comment) => [comment.id, comment])),
  };
}

export function receive(state: ShareState, snapshot: ShareSnapshot) {
  if (snapshot.revision <= state.revision) {
    return state;
  }
  return initialState(snapshot);
}

export function applyOptimistic(
  state: ShareState,
  {actorId, actor, createdAt, change}: OptimisticChange,
) {
  const threads = new Map(state.threads);
  const comments = new Map(state.comments);

  switch (change.type) {
    case 'openThread':
      threads.set(change.threadId, {
        id: change.threadId,
        anchor: change.anchor,
        actorId,
        actor,
        createdAt,
      });
      break;
    case 'createComment':
      comments.set(change.commentId, {
        id: change.commentId,
        threadId: change.threadId,
        actorId,
        actor,
        body: change.body,
        createdAt,
      });
      break;
    default:
      change satisfies never;
  }

  return {...state, threads, comments};
}
