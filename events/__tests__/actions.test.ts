import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '@/auth/server';
import {insertUser, setupTestDb} from '@/db/__tests__/setup';
import {getEvents} from '@/db/events';
import {createShare} from '@/db/shares';
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
  return {shareId, filePath: 'a.ts', side: 'additions', line: 1, ...overrides};
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

async function storedTypes() {
  const events = await getEvents(shareId);
  return events.map(({type}) => type);
}

beforeEach(async () => {
  vi.stubEnv('__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS', 'true');
  shareId = await createShare([]);
  alice = (await insertUser()).id;
  bob = (await insertUser()).id;
  signIn(alice);
});

describe('openThread', () => {
  it('stores the thread with its first comment', async () => {
    const {threadId, commentId} = await openAliceThread();

    const events = await getEvents(shareId);

    expect(events).toMatchObject([
      {seq: 1, actorId: alice, subjectId: threadId, type: 'thread.opened'},
      {seq: 2, actorId: alice, subjectId: commentId, type: 'comment.created'},
    ]);
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
    ).rejects.toThrow(`Invalid share id: ${otherShareId}`);
    await expect(storedTypes()).resolves.toEqual([]);
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
    await expect(storedTypes()).resolves.toEqual([]);
  });
});

describe('resolveThread', () => {
  it('resolves a thread opened by the user', async () => {
    const {threadId} = await openAliceThread();

    await resolveThread({shareId, threadId});

    await expect(storedTypes()).resolves.toEqual([
      'thread.opened',
      'comment.created',
      'thread.resolved',
    ]);
  });

  it("rejects resolving another user's thread", async () => {
    const {threadId} = await openAliceThread();
    signIn(bob);

    await expect(resolveThread({shareId, threadId})).rejects.toThrow(
      `${threadId} not owned by actor: ${bob}`,
    );
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

    const events = await getEvents(shareId);
    expect(events.at(-1)).toMatchObject({
      actorId: bob,
      subjectId: commentId,
      type: 'comment.created',
    });
  });

  it('rejects replying to a resolved thread', async () => {
    const {threadId} = await openAliceThread();
    await resolveThread({shareId, threadId});

    await expect(
      createComment({shareId, threadId, commentId: newId(), body: BODY}),
    ).rejects.toThrow(`Thread already resolved: ${threadId}`);
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

    await editComment({shareId, commentId, body: BODY});

    await expect(storedTypes()).resolves.toContain('comment.edited');
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

    await expect(storedTypes()).resolves.toContain('comment.deleted');
  });

  it('rejects deleting a comment twice', async () => {
    const {commentId} = await openAliceThread();
    await deleteComment({shareId, commentId});

    await expect(deleteComment({shareId, commentId})).rejects.toThrow(
      `Comment already deleted: ${commentId}`,
    );
  });

  it('rejects invalid input', async () => {
    await expect(
      deleteComment({shareId, commentId: 'not-a-uuid'}),
    ).rejects.toThrow('Invalid delete comment input');
  });
});
