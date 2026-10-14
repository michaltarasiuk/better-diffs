import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '@/auth/server';
import {insertUser, setupTestDb} from '@/db/__tests__/setup';
import {createShare} from '@/db/shares';
import {getSnapshot} from '@/db/threads';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {
  createComment,
  deleteComment,
  editComment,
  openThread,
  resolveThread,
} from '../actions';
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

function anchor(overrides: Partial<Anchor> = {}): Anchor {
  return {shareId, filePath: 'a.txt', side: 'additions', line: 1, ...overrides};
}

async function openAliceThread() {
  const threadId = newId();
  const commentId = newId();
  await openThread({
    shareId,
    threadId,
    commentId,
    body: BODY,
    anchor: anchor(),
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
      threads: [{id: threadId, actorId: alice, anchor: anchor()}],
      comments: [{id: commentId, threadId, actorId: alice, body: BODY}],
    });
  });

  it('rejects an anchor from another share', async () => {
    const otherShareId = newId();

    await expect(
      openThread({
        shareId,
        threadId: newId(),
        commentId: newId(),
        body: BODY,
        anchor: anchor({shareId: otherShareId}),
      }),
    ).rejects.toThrow('Invalid open thread input');
    await expect(stored()).resolves.toMatchObject({threads: []});
  });

  it('rejects invalid input', async () => {
    await expect(
      openThread({
        shareId,
        threadId: 'not-a-uuid',
        commentId: newId(),
        body: BODY,
        anchor: anchor(),
      }),
    ).rejects.toThrow('Invalid open thread input');
  });

  it('rejects reusing a thread id', async () => {
    const {threadId} = await openAliceThread();

    await expect(
      openThread({
        shareId,
        threadId,
        commentId: newId(),
        body: BODY,
        anchor: anchor(),
      }),
    ).rejects.toThrow(`Thread already exists: ${threadId}`);
  });

  it('requires a session', async () => {
    signIn(null);

    await expect(openAliceThread()).rejects.toMatchObject({
      digest: expect.stringMatching(/;401$/),
    });
    await expect(stored()).resolves.toMatchObject({threads: []});
  });
});

describe('resolveThread', () => {
  it('resolves a thread opened by the user', async () => {
    const {threadId} = await openAliceThread();

    await resolveThread({shareId, threadId});

    await expect(stored()).resolves.toMatchObject({
      threads: [{id: threadId, resolved: true}],
    });
  });

  it("resolves another user's thread", async () => {
    const {threadId} = await openAliceThread();
    signIn(bob);

    await resolveThread({shareId, threadId});

    await expect(stored()).resolves.toMatchObject({
      threads: [{id: threadId, resolved: true}],
    });
  });

  it('rejects resolving a thread twice', async () => {
    const {threadId} = await openAliceThread();
    await resolveThread({shareId, threadId});

    await expect(resolveThread({shareId, threadId})).rejects.toThrow(
      `Thread already resolved: ${threadId}`,
    );
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

  it('rejects replying to a resolved thread', async () => {
    const {threadId} = await openAliceThread();
    await resolveThread({shareId, threadId});

    await expect(
      createComment({shareId, threadId, commentId: newId(), body: BODY}),
    ).rejects.toThrow(`Thread already resolved: ${threadId}`);
  });

  it('rejects reusing an existing comment id', async () => {
    const {commentId} = await openAliceThread();
    const {threadId} = await openAliceThread();
    signIn(bob);

    await expect(
      createComment({shareId, threadId, commentId, body: BODY}),
    ).rejects.toThrow(`Comment already exists: ${commentId}`);
  });

  it('rejects replying to an unknown thread', async () => {
    const threadId = newId();

    await expect(
      createComment({shareId, threadId, commentId: newId(), body: BODY}),
    ).rejects.toThrow(`Thread not found: ${threadId}`);
  });
});

describe('editComment', () => {
  it("edits the user's comment", async () => {
    const {commentId} = await openAliceThread();

    const edited = {root: {edited: true}} as unknown as SerializedEditorState;

    await editComment({shareId, commentId, body: edited});

    await expect(stored()).resolves.toMatchObject({
      comments: [{id: commentId, body: edited}],
    });
  });

  it("rejects editing another user's comment", async () => {
    const {commentId} = await openAliceThread();
    signIn(bob);

    await expect(editComment({shareId, commentId, body: BODY})).rejects.toThrow(
      `${commentId} not owned by actor: ${bob}`,
    );
  });
});

describe('deleteComment', () => {
  it("deletes the user's comment", async () => {
    const {commentId} = await openAliceThread();

    await deleteComment({shareId, commentId});

    await expect(stored()).resolves.toMatchObject({comments: []});
  });

  it("rejects deleting another user's comment", async () => {
    const {commentId} = await openAliceThread();
    signIn(bob);

    await expect(deleteComment({shareId, commentId})).rejects.toThrow(
      `${commentId} not owned by actor: ${bob}`,
    );
  });

  it('rejects deleting a comment twice', async () => {
    const {commentId} = await openAliceThread();
    await deleteComment({shareId, commentId});

    await expect(deleteComment({shareId, commentId})).rejects.toThrow(
      `Comment not found: ${commentId}`,
    );
  });

  it('rejects invalid input', async () => {
    await expect(
      deleteComment({shareId, commentId: 'not-a-uuid'}),
    ).rejects.toThrow('Invalid delete comment input');
  });
});
