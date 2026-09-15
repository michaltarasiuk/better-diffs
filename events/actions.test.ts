import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {openThread} from './actions';

const {appendEvents, getSession, unauthorized} = vi.hoisted(() => ({
  appendEvents: vi.fn(),
  getSession: vi.fn(),
  unauthorized: vi.fn(() => {
    throw new Error('UNAUTHORIZED');
  }),
}));

vi.mock('@/db/events', () => ({appendEvents}));
vi.mock('@/auth/server', () => ({getSession}));
vi.mock('next/navigation', () => ({unauthorized}));

const SHARE_ID = '00000000-0000-4000-8000-000000000001';
const THREAD_ID = '00000000-0000-4000-8000-000000000002';
const COMMENT_ID = '00000000-0000-4000-8000-000000000003';
const ACTOR_ID = 'actor-id';

const BODY = {text: 'value'} as unknown as SerializedEditorState;

function input(overrides: Record<string, unknown> = {}) {
  return {
    shareId: SHARE_ID,
    threadId: THREAD_ID,
    commentId: COMMENT_ID,
    body: BODY,
    anchor: {
      shareId: SHARE_ID,
      filePath: 'src/a.ts',
      side: 'additions',
      line: 12,
    },
    ...overrides,
  } as Parameters<typeof openThread>[0];
}

beforeEach(() => {
  appendEvents.mockReset();
  appendEvents.mockResolvedValue([]);
  getSession.mockReset();
  getSession.mockResolvedValue({user: {id: ACTOR_ID}});
  unauthorized.mockClear();
});

describe('openThread', () => {
  it('appends the thread and its first comment as one batch', async () => {
    await openThread(input());

    expect(appendEvents).toHaveBeenCalledWith(SHARE_ID, ACTOR_ID, [
      {
        $type: 'thread.opened',
        threadId: THREAD_ID,
        anchor: expect.objectContaining({line: 12}),
      },
      {
        $type: 'comment.created',
        threadId: THREAD_ID,
        commentId: COMMENT_ID,
        body: BODY,
      },
    ]);
  });

  it('attributes the events to the signed-in user', async () => {
    getSession.mockResolvedValue({user: {id: 'other-user-id'}});

    await openThread(input());

    expect(appendEvents).toHaveBeenCalledWith(
      SHARE_ID,
      'other-user-id',
      expect.anything(),
    );
  });

  it('rejects an anonymous caller before validating anything', async () => {
    getSession.mockResolvedValue(null);

    await expect(openThread(input())).rejects.toThrow('UNAUTHORIZED');

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects an anchor pointing at another share', async () => {
    const other = '00000000-0000-4000-8000-000000000009';

    await expect(
      openThread(input({anchor: {...input().anchor, shareId: other}})),
    ).rejects.toThrow(`Anchor shareId ${other} does not match ${SHARE_ID}`);

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it.each([
    {name: 'a non-uuid shareId', overrides: {shareId: 'invalid'}},
    {name: 'a non-uuid threadId', overrides: {threadId: 'invalid'}},
    {name: 'a non-uuid commentId', overrides: {commentId: 'invalid'}},
    {name: 'a missing body', overrides: {body: null}},
    {
      name: 'a zero line anchor',
      overrides: {
        anchor: {
          shareId: SHARE_ID,
          filePath: 'src/a.ts',
          side: 'additions',
          line: 0,
        },
      },
    },
    {
      name: 'an unknown anchor side',
      overrides: {
        anchor: {
          shareId: SHARE_ID,
          filePath: 'src/a.ts',
          side: 'both',
          line: 1,
        },
      },
    },
  ])('rejects $name', async ({overrides}) => {
    await expect(openThread(input(overrides))).rejects.toThrow(
      /Invalid open thread input/,
    );

    expect(appendEvents).not.toHaveBeenCalled();
  });
});
