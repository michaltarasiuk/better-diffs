import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '@/auth/server';
import {
  createActor,
  createAnchor,
  createCommentCreated,
  createCommentDeleted,
  createCommentEdited,
  createLexicalBody,
  createShareEvent,
  createThreadOpened,
  createThreadResolved,
} from '@/testing/events';
import {uuid} from '@/testing/uuid';

import {
  createComment,
  deleteComment,
  editComment,
  openThread,
  resolveThread,
} from './actions';
import type {
  CreateCommentInput,
  DeleteCommentInput,
  EditCommentInput,
  OpenThreadInput,
  ResolveThreadInput,
  ShareEventPayload,
} from './schemas';

const {getSession, unauthorized, getEvents, appendEvents} = vi.hoisted(() => ({
  getSession: vi.fn<typeof import('@/auth/server').getSession>(),
  unauthorized: vi.fn<typeof import('next/navigation').unauthorized>(() => {
    throw new Error('Unauthorized');
  }),
  getEvents: vi.fn<typeof import('@/db/events').getEvents>(),
  appendEvents: vi.fn<typeof import('@/db/events').appendEvents>(),
}));

vi.mock('@/auth/server', () => ({getSession}));
vi.mock('next/navigation', () => ({unauthorized}));
vi.mock('@/db/events', () => ({getEvents, appendEvents}));

let session: Session;

function createSession() {
  return {user: {id: uuid()}} as Session;
}

function createOpenThreadInput(
  overrides: Partial<OpenThreadInput> = {},
): OpenThreadInput {
  const shareId = overrides.shareId ?? uuid();

  return {
    shareId,
    threadId: uuid(),
    commentId: uuid(),
    body: createLexicalBody(),
    anchor: createAnchor({shareId}),
    ...overrides,
  };
}

function createResolveThreadInput(
  overrides: Partial<ResolveThreadInput> = {},
): ResolveThreadInput {
  return {
    shareId: uuid(),
    threadId: uuid(),
    ...overrides,
  };
}

function createCreateCommentInput(
  overrides: Partial<CreateCommentInput> = {},
): CreateCommentInput {
  return {
    shareId: uuid(),
    threadId: uuid(),
    commentId: uuid(),
    body: createLexicalBody(),
    ...overrides,
  };
}

function createEditCommentInput(
  overrides: Partial<EditCommentInput> = {},
): EditCommentInput {
  return {
    shareId: uuid(),
    commentId: uuid(),
    body: createLexicalBody(),
    ...overrides,
  };
}

function createDeleteCommentInput(
  overrides: Partial<DeleteCommentInput> = {},
): DeleteCommentInput {
  return {
    shareId: uuid(),
    commentId: uuid(),
    ...overrides,
  };
}

function createShareEventLog(shareId: string) {
  const actorId = uuid();
  const actor = createActor();
  let seq = 0;

  return (...payloads: readonly ShareEventPayload[]) =>
    payloads.map((payload) =>
      createShareEvent(payload, {seq: ++seq, shareId, actorId, actor}),
    );
}

beforeEach(() => {
  session = createSession();
  getSession.mockResolvedValue(session);
  getEvents.mockResolvedValue([]);
  appendEvents.mockResolvedValue([]);
});

describe.each([
  {
    name: 'openThread',
    action: (overrides?: {shareId: string}) =>
      openThread(createOpenThreadInput(overrides)),
    message: 'Invalid open thread input',
  },
  {
    name: 'resolveThread',
    action: (overrides?: {shareId: string}) =>
      resolveThread(createResolveThreadInput(overrides)),
    message: 'Invalid resolve thread input',
  },
  {
    name: 'createComment',
    action: (overrides?: {shareId: string}) =>
      createComment(createCreateCommentInput(overrides)),
    message: 'Invalid create comment input',
  },
  {
    name: 'editComment',
    action: (overrides?: {shareId: string}) =>
      editComment(createEditCommentInput(overrides)),
    message: 'Invalid edit comment input',
  },
  {
    name: 'deleteComment',
    action: (overrides?: {shareId: string}) =>
      deleteComment(createDeleteCommentInput(overrides)),
    message: 'Invalid delete comment input',
  },
])('$name', ({action, message}) => {
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(action()).rejects.toThrow('Unauthorized');

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(getEvents).not.toHaveBeenCalled();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(action({shareId: 'not-a-uuid'})).rejects.toMatchObject({
      name: 'Error',
      message,
    });

    expect(getEvents).not.toHaveBeenCalled();
    expect(appendEvents).not.toHaveBeenCalled();
  });
});

describe('openThread', () => {
  it('rejects anchors that belong to another share', async () => {
    const otherShareId = uuid();

    await expect(
      openThread(
        createOpenThreadInput({
          anchor: createAnchor({shareId: otherShareId, line: 3}),
        }),
      ),
    ).rejects.toThrow(`Invalid share id: ${otherShareId}`);

    expect(getEvents).not.toHaveBeenCalled();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects opening a thread that already exists', async () => {
    const input = createOpenThreadInput();
    const log = createShareEventLog(input.shareId);

    getEvents.mockResolvedValue(
      log(
        createThreadOpened({
          threadId: input.threadId,
          anchor: input.anchor,
        }),
      ),
    );

    await expect(openThread(input)).rejects.toThrow(
      `Thread already exists: ${input.threadId}`,
    );

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends thread and comment events for the signed-in user', async () => {
    const input = createOpenThreadInput();

    await openThread(input);

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [
        createThreadOpened({
          threadId: input.threadId,
          anchor: input.anchor,
        }),
        createCommentCreated({
          threadId: input.threadId,
          commentId: input.commentId,
          body: input.body,
        }),
      ],
    );
  });
});

describe('resolveThread', () => {
  it('rejects resolving a missing thread', async () => {
    const input = createResolveThreadInput();

    await expect(resolveThread(input)).rejects.toThrow(
      `Thread not found: ${input.threadId}`,
    );

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects resolving an already resolved thread', async () => {
    const input = createResolveThreadInput();
    const log = createShareEventLog(input.shareId);

    getEvents.mockResolvedValue(
      log(
        createThreadOpened({
          threadId: input.threadId,
          anchor: createAnchor({shareId: input.shareId}),
        }),
        createThreadResolved({
          threadId: input.threadId,
        }),
      ),
    );

    await expect(resolveThread(input)).rejects.toThrow(
      `Thread already resolved: ${input.threadId}`,
    );

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends a thread.resolved event for the signed-in user', async () => {
    const input = createResolveThreadInput();
    const log = createShareEventLog(input.shareId);

    getEvents.mockResolvedValue(
      log(
        createThreadOpened({
          threadId: input.threadId,
          anchor: createAnchor({shareId: input.shareId}),
        }),
      ),
    );

    await resolveThread(input);

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [
        createThreadResolved({
          threadId: input.threadId,
        }),
      ],
    );
  });
});

describe('createComment', () => {
  it('rejects creating a comment on a missing thread', async () => {
    const input = createCreateCommentInput();

    await expect(createComment(input)).rejects.toThrow(
      `Thread not found: ${input.threadId}`,
    );

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends a comment.created event for the signed-in user', async () => {
    const input = createCreateCommentInput();
    const log = createShareEventLog(input.shareId);

    getEvents.mockResolvedValue(
      log(
        createThreadOpened({
          threadId: input.threadId,
          anchor: createAnchor({shareId: input.shareId}),
        }),
      ),
    );

    await createComment(input);

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [
        createCommentCreated({
          threadId: input.threadId,
          commentId: input.commentId,
          body: input.body,
        }),
      ],
    );
  });
});

describe('editComment', () => {
  it('rejects editing a missing comment', async () => {
    const input = createEditCommentInput();

    await expect(editComment(input)).rejects.toThrow(
      `Comment not found: ${input.commentId}`,
    );

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends a comment.edited event for the signed-in user', async () => {
    const threadId = uuid();
    const input = createEditCommentInput();
    const log = createShareEventLog(input.shareId);

    getEvents.mockResolvedValue(
      log(
        createThreadOpened({
          threadId,
          anchor: createAnchor({shareId: input.shareId}),
        }),
        createCommentCreated({
          threadId,
          commentId: input.commentId,
          body: createLexicalBody('original'),
        }),
      ),
    );

    await editComment(input);

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [
        createCommentEdited({
          commentId: input.commentId,
          body: input.body,
        }),
      ],
    );
  });
});

describe('deleteComment', () => {
  it('rejects deleting a missing comment', async () => {
    const input = createDeleteCommentInput();

    await expect(deleteComment(input)).rejects.toThrow(
      `Comment not found: ${input.commentId}`,
    );

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends a comment.deleted event for the signed-in user', async () => {
    const threadId = uuid();
    const input = createDeleteCommentInput();
    const log = createShareEventLog(input.shareId);

    getEvents.mockResolvedValue(
      log(
        createThreadOpened({
          threadId,
          anchor: createAnchor({shareId: input.shareId}),
        }),
        createCommentCreated({
          threadId,
          commentId: input.commentId,
        }),
      ),
    );

    await deleteComment(input);

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(input.shareId);
    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [
        createCommentDeleted({
          commentId: input.commentId,
        }),
      ],
    );
  });
});
