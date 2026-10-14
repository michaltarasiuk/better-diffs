import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '@/auth/server';
import {insertUser, setupTestDb} from '@/db/__tests__/setup';
import {createShare} from '@/db/shares';
import {getSnapshot} from '@/db/threads';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {createComment, openThread} from '../actions';
import type {Anchor} from '../schemas';

const {getSession} = vi.hoisted(() => ({
  getSession: vi.fn<typeof import('@/auth/server').getSession>(),
}));

vi.mock('@/auth/server', () => ({getSession}));

setupTestDb();

const BODY = {root: {}} as SerializedEditorState;

let shareId: string;
let alice: string;
let bob: string;

function signIn(userId: string | null) {
  getSession.mockResolvedValue(
    isDefined(userId)
      ? ({user: {id: userId, name: userId, image: null}} as Session)
      : null,
  );
}

const ANCHOR = {
  filePath: 'a.txt',
  side: 'additions',
  line: 1,
} satisfies Anchor;

async function openAliceThread() {
  const threadId = newId();
  const commentId = newId();
  await openThread({
    shareId,
    threadId,
    commentId,
    body: BODY,
    anchor: ANCHOR,
  });
  return {threadId, commentId};
}

async function stored() {
  const snapshot = await getSnapshot(shareId);
  return snapshot!;
}

beforeEach(async () => {
  vi.stubEnv('__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS', 'true');
  shareId = await createShare('', []);
  alice = (await insertUser()).id;
  bob = (await insertUser()).id;
  signIn(alice);
});

describe('openThread', () => {
  it('stores the thread with its first comment', async () => {
    const {threadId, commentId} = await openAliceThread();

    await expect(stored()).resolves.toMatchObject({
      threads: [{id: threadId, actorId: alice, anchor: ANCHOR}],
      comments: [{id: commentId, threadId, actorId: alice, body: BODY}],
    });
  });

  it('rejects invalid input', async () => {
    await expect(
      openThread({
        shareId,
        threadId: 'not-a-uuid',
        commentId: newId(),
        body: BODY,
        anchor: ANCHOR,
      }),
    ).resolves.toEqual({
      reason: 'INVALID_INPUT',
      message: 'Invalid open thread input',
    });
  });

  it('rejects reusing a thread id', async () => {
    const {threadId} = await openAliceThread();

    await expect(
      openThread({
        shareId,
        threadId,
        commentId: newId(),
        body: BODY,
        anchor: ANCHOR,
      }),
    ).resolves.toEqual({
      reason: 'THREAD_ALREADY_EXISTS',
      message: `Thread already exists: ${threadId}`,
    });
  });

  it('rejects an unknown share', async () => {
    const unknownShareId = newId();

    await expect(
      openThread({
        shareId: unknownShareId,
        threadId: newId(),
        commentId: newId(),
        body: BODY,
        anchor: ANCHOR,
      }),
    ).resolves.toEqual({
      reason: 'SHARE_NOT_FOUND',
      message: `Share not found: ${unknownShareId}`,
    });
  });

  it('requires a session', async () => {
    signIn(null);

    await expect(openAliceThread()).rejects.toMatchObject({
      digest: expect.stringMatching(/;401$/),
    });
    await expect(stored()).resolves.toMatchObject({threads: []});
  });
});

describe('createComment', () => {
  it('lets anyone reply to a thread', async () => {
    const {threadId} = await openAliceThread();
    signIn(bob);
    const commentId = newId();

    await createComment({shareId, threadId, commentId, body: BODY});

    const {comments} = await stored();
    expect(comments.at(-1)).toMatchObject({
      id: commentId,
      threadId,
      actorId: bob,
    });
  });

  it('rejects reusing an existing comment id', async () => {
    const {commentId} = await openAliceThread();
    const {threadId} = await openAliceThread();
    signIn(bob);

    await expect(
      createComment({shareId, threadId, commentId, body: BODY}),
    ).resolves.toEqual({
      reason: 'COMMENT_ALREADY_EXISTS',
      message: `Comment already exists: ${commentId}`,
    });
  });

  it('rejects replying to an unknown thread', async () => {
    const threadId = newId();

    await expect(
      createComment({shareId, threadId, commentId: newId(), body: BODY}),
    ).resolves.toEqual({
      reason: 'THREAD_NOT_FOUND',
      message: `Thread not found: ${threadId}`,
    });
  });
});
