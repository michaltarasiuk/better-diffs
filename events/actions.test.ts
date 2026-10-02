import {beforeEach, describe, expect, it, vi} from 'vitest';

import {createSession} from '@/testing/auth';
import {
  createAnchor,
  createCommentCreated,
  createCommentDeleted,
  createCommentEdited,
  createCreateCommentInput,
  createDeleteCommentInput,
  createEditCommentInput,
  createOpenThreadInput,
  createResolveThreadInput,
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
import type {OpenThreadInput, ShareEventPayload} from './schemas';

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

function createOpenThreadPayloads(input: OpenThreadInput) {
  return [
    createThreadOpened({
      threadId: input.threadId,
      anchor: input.anchor,
    }),
    createCommentCreated({
      threadId: input.threadId,
      commentId: input.commentId,
      body: input.body,
    }),
  ] satisfies ShareEventPayload[];
}

beforeEach(() => {
  getSession.mockResolvedValue(createSession());
  appendEvents.mockResolvedValue([]);
});

describe('openThread', () => {
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(openThread(createOpenThreadInput())).rejects.toThrow(
      'Unauthorized',
    );

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(
      openThread(createOpenThreadInput({shareId: 'not-a-uuid'})),
    ).rejects.toMatchObject({
      name: 'TypeError',
      message: 'Invalid open thread input',
    });

    expect(appendEvents).not.toHaveBeenCalled();
  });

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
      createOpenThreadPayloads(input),
    );
  });
});

describe('resolveThread', () => {
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(resolveThread(createResolveThreadInput())).rejects.toThrow(
      'Unauthorized',
    );

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(
      resolveThread(createResolveThreadInput({shareId: 'not-a-uuid'})),
    ).rejects.toMatchObject({
      name: 'TypeError',
      message: 'Invalid resolve thread input',
    });

    expect(appendEvents).not.toHaveBeenCalled();
  });

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
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(createComment(createCreateCommentInput())).rejects.toThrow(
      'Unauthorized',
    );

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(
      createComment(createCreateCommentInput({shareId: 'not-a-uuid'})),
    ).rejects.toMatchObject({
      name: 'TypeError',
      message: 'Invalid create comment input',
    });

    expect(appendEvents).not.toHaveBeenCalled();
  });

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
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(editComment(createEditCommentInput())).rejects.toThrow(
      'Unauthorized',
    );

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(
      editComment(createEditCommentInput({shareId: 'not-a-uuid'})),
    ).rejects.toMatchObject({
      name: 'TypeError',
      message: 'Invalid edit comment input',
    });

    expect(appendEvents).not.toHaveBeenCalled();
  });

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
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(deleteComment(createDeleteCommentInput())).rejects.toThrow(
      'Unauthorized',
    );

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(
      deleteComment(createDeleteCommentInput({shareId: 'not-a-uuid'})),
    ).rejects.toMatchObject({
      name: 'TypeError',
      message: 'Invalid delete comment input',
    });

    expect(appendEvents).not.toHaveBeenCalled();
  });

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
