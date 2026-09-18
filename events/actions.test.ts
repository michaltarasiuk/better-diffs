import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {Session} from '@/auth/auth';
import {FIXTURE} from '@/fixtures/fixture';
import {openThread} from './actions';
import type {Anchor, ShareEventPayload} from './schemas';

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

type OpenThreadInput = Parameters<typeof openThread>[0];

function anchor(line = 3, shareId: string = FIXTURE.share.id) {
  return {
    shareId,
    filePath: 'src/a.ts',
    side: 'additions',
    line,
  } satisfies Anchor;
}

function body(text = 'value') {
  return {text} as unknown as SerializedEditorState;
}

function openThreadInput(overrides: Partial<OpenThreadInput> = {}) {
  return {
    shareId: FIXTURE.share.id,
    threadId: FIXTURE.thread.id,
    commentId: FIXTURE.comment.id,
    body: body(),
    anchor: anchor(),
    ...overrides,
  } satisfies OpenThreadInput;
}

function openThreadPayloads(input: OpenThreadInput) {
  return [
    {
      $type: 'thread.opened',
      threadId: input.threadId,
      anchor: input.anchor,
    },
    {
      $type: 'comment.created',
      threadId: input.threadId,
      commentId: input.commentId,
      body: input.body,
    },
  ] satisfies ShareEventPayload[];
}

function session() {
  return {
    user: {id: FIXTURE.actor.id},
  } as Session;
}

beforeEach(() => {
  getSession.mockResolvedValue(session());
  appendEvents.mockResolvedValue([]);
});

describe('openThread', () => {
  it('rejects unauthenticated callers', async () => {
    getSession.mockResolvedValue(null);

    await expect(openThread(openThreadInput())).rejects.toThrow('Unauthorized');

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects invalid input', async () => {
    await expect(
      openThread(openThreadInput({shareId: 'not-a-uuid'})),
    ).rejects.toThrow('Invalid open thread input');

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects anchors that belong to another share', async () => {
    await expect(
      openThread(openThreadInput({anchor: anchor(3, FIXTURE.share.alt)})),
    ).rejects.toThrow(
      `Anchor shareId ${FIXTURE.share.alt} does not match ${FIXTURE.share.id}`,
    );

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends thread and comment events for the signed-in user', async () => {
    const input = openThreadInput();

    await openThread(input);

    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      FIXTURE.share.id,
      FIXTURE.actor.id,
      openThreadPayloads(input),
    );
  });
});
