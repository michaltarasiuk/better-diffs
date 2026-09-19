import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  createAnchor,
  createOpenThreadInput,
  createOpenThreadPayloads,
  createSession,
} from '@/testing/factories/events';
import {SHARE_ID, SHARE_ID_SECONDARY, USER_ID} from '@/testing/ids';
import {openThread} from './actions';

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
    ).rejects.toThrow('Invalid open thread input');

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('rejects anchors that belong to another share', async () => {
    await expect(
      openThread(
        createOpenThreadInput({
          anchor: createAnchor({
            line: 3,
            shareId: SHARE_ID_SECONDARY,
          }),
        }),
      ),
    ).rejects.toThrow(
      `Anchor shareId ${SHARE_ID_SECONDARY} does not match ${SHARE_ID}`,
    );

    expect(appendEvents).not.toHaveBeenCalled();
  });

  it('appends thread and comment events for the signed-in user', async () => {
    const input = createOpenThreadInput();

    await openThread(input);

    expect(appendEvents).toHaveBeenCalledExactlyOnceWith(
      SHARE_ID,
      USER_ID,
      createOpenThreadPayloads(input),
    );
  });
});
