import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '@/auth/server';
import {
  createAnchor,
  createCommentCreated,
  createCommentDeleted,
  createCommentEdited,
  createLexicalBody,
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
} from './schemas';

const {appendEvents, getSession, unauthorized} = vi.hoisted(() => ({
  appendEvents: vi.fn<typeof import('@/db/events').appendEvents>(),
  getSession: vi.fn<typeof import('@/auth/server').getSession>(),
  unauthorized: vi.fn<typeof import('next/navigation').unauthorized>(() => {
    throw new Error('Unauthorized');
  }),
}));

vi.mock('@/auth/server', () => ({getSession}));
vi.mock('@/db/events', () => ({appendEvents}));
vi.mock('next/navigation', () => ({unauthorized}));

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

beforeEach(() => {
  getSession.mockResolvedValue(createSession());
  appendEvents.mockResolvedValue([]);
});

describe.each([
  {
    name: 'openThread',
    call: (overrides?: {shareId: string}) =>
      openThread(createOpenThreadInput(overrides)),
    message: 'Invalid open thread input',
  },
  {
    name: 'resolveThread',
    call: (overrides?: {shareId: string}) =>
      resolveThread(createResolveThreadInput(overrides)),
    message: 'Invalid resolve thread input',
  },
  {
    name: 'createComment',
    call: (overrides?: {shareId: string}) =>
      createComment(createCreateCommentInput(overrides)),
    message: 'Invalid create comment input',
  },
  {
    name: 'editComment',
    call: (overrides?: {shareId: string}) =>
      editComment(createEditCommentInput(overrides)),
    message: 'Invalid edit comment input',
  },
  {
    name: 'deleteComment',
    call: (overrides?: {shareId: string}) =>
      deleteComment(createDeleteCommentInput(overrides)),
    message: 'Invalid delete comment input',
  },
])('$name', ({call, message}) => {
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(call()).rejects.toThrow('Unauthorized');

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(call({shareId: 'not-a-uuid'})).rejects.toMatchObject({
      name: 'TypeError',
      message,
    });

    expect(appendEvents).not.toHaveBeenCalled();
  });
});

describe('openThread', () => {
  it('rejects anchors that belong to another share', async () => {
    const otherShareId = uuid();

    await expect(
      openThread(
        createOpenThreadInput({
          anchor: createAnchor({
            shareId: otherShareId,
            line: 3,
          }),
        }),
      ),
    ).rejects.toThrow(`Invalid anchor share id: ${otherShareId}`);

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends thread and comment events for the signed-in user', async () => {
    const session = createSession();
    getSession.mockResolvedValue(session);
    const input = createOpenThreadInput();

    await openThread(input);

    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [
        createThreadOpened({threadId: input.threadId, anchor: input.anchor}),
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
  it('appends a thread.resolved event for the signed-in user', async () => {
    const session = createSession();
    getSession.mockResolvedValue(session);
    const input = createResolveThreadInput();

    await resolveThread(input);

    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [createThreadResolved({threadId: input.threadId})],
    );
  });
});

describe('createComment', () => {
  it('appends a comment.created event for the signed-in user', async () => {
    const session = createSession();
    getSession.mockResolvedValue(session);
    const input = createCreateCommentInput();

    await createComment(input);

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
  it('appends a comment.edited event for the signed-in user', async () => {
    const session = createSession();
    getSession.mockResolvedValue(session);
    const input = createEditCommentInput();

    await editComment(input);

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
  it('appends a comment.deleted event for the signed-in user', async () => {
    const session = createSession();
    getSession.mockResolvedValue(session);
    const input = createDeleteCommentInput();

    await deleteComment(input);

    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      input.shareId,
      session.user.id,
      [createCommentDeleted({commentId: input.commentId})],
    );
  });
});
