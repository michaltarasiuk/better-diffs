import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '#/auth/server';
import {
  createShareWithFile,
  insertUser,
  setupTestDb,
} from '#/db/__tests__/setup';
import {getSnapshot} from '#/db/threads';
import {commentBody} from '#/lexical/__tests__/bodies';
import {isDefined} from '#/utils/is-defined';
import {newId} from '#/utils/new-id';

import {createComment, openThread} from '../actions';
import type {Anchor} from '../schemas';

const {getSession} = vi.hoisted(() => ({
  getSession: vi.fn<typeof import('#/auth/server').getSession>(),
}));

vi.mock('#/auth/server', () => ({getSession}));

setupTestDb();

const BODY = commentBody('hello');

let shareId: string;
let anchor: Anchor;
let alice: string;
let bob: string;

function signIn(userId: string | null) {
  getSession.mockResolvedValue(
    isDefined(userId)
      ? ({user: {id: userId, name: userId, image: null}} as Session)
      : null,
  );
}

async function openAliceThread() {
  const threadId = newId();
  const commentId = newId();
  await openThread({
    shareId,
    threadId,
    commentId,
    body: BODY,
    anchor,
  });
  return {threadId, commentId};
}

async function stored() {
  const snapshot = await getSnapshot(shareId);
  return snapshot!;
}

beforeEach(async () => {
  vi.stubEnv('__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS', 'true');
  const share = await createShareWithFile();
  shareId = share.shareId;
  anchor = {fileId: share.fileId, side: 'additions', line: 1};
  alice = (await insertUser()).id;
  bob = (await insertUser()).id;
  signIn(alice);
});

describe('openThread', () => {
  it('stores the thread with its first comment', async () => {
    const {threadId, commentId} = await openAliceThread();

    await expect(stored()).resolves.toMatchObject({
      threads: [{id: threadId, actorId: alice, anchor}],
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
        anchor,
      }),
    ).resolves.toEqual({
      reason: 'INVALID_INPUT',
      message: 'Invalid open thread input',
    });
  });

  it('rejects a body the editor cannot read', async () => {
    await expect(
      openThread({
        shareId,
        threadId: newId(),
        commentId: newId(),
        body: {root: {}} as SerializedEditorState,
        anchor,
      }),
    ).resolves.toMatchObject({reason: 'INVALID_INPUT'});
    await expect(stored()).resolves.toMatchObject({threads: []});
  });

  it('rejects a file of another share', async () => {
    const other = await createShareWithFile();

    await expect(
      openThread({
        shareId,
        threadId: newId(),
        commentId: newId(),
        body: BODY,
        anchor: {...anchor, fileId: other.fileId},
      }),
    ).resolves.toEqual({
      reason: 'FILE_NOT_FOUND',
      message: `File not found: ${other.fileId}`,
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
        anchor,
      }),
    ).resolves.toEqual({
      reason: 'THREAD_ALREADY_EXISTS',
      message: `Thread already exists: ${threadId}`,
    });
  });

  it('rejects a thread id taken in another share', async () => {
    const {threadId} = await openAliceThread();
    const other = await createShareWithFile();

    await expect(
      openThread({
        shareId: other.shareId,
        threadId,
        commentId: newId(),
        body: BODY,
        anchor: {...anchor, fileId: other.fileId},
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
        anchor,
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
