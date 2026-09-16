// @vitest-environment jsdom

import {renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {useKeyDown} from './use-key-down';

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', {key}));
}

describe('useKeyDown', () => {
  it('forwards key presses to the handler', () => {
    const onKeyDown = vi.fn();
    renderHook(() => useKeyDown(onKeyDown));

    pressKey('k');

    expect(onKeyDown).toHaveBeenCalledExactlyOnceWith(
      expect.any(KeyboardEvent),
    );
  });

  it('forwards key presses to the newest handler after a rerender', () => {
    const first = vi.fn();
    const second = vi.fn();

    const {rerender} = renderHook(({handler}) => useKeyDown(handler), {
      initialProps: {handler: first},
    });
    rerender({handler: second});

    pressKey('k');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(expect.any(KeyboardEvent));
  });

  it('keeps a single listener when the handler changes', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const countSubscriptions = () =>
      addEventListener.mock.calls.filter(([type]) => type === 'keydown').length;

    const {rerender} = renderHook(({handler}) => useKeyDown(handler), {
      initialProps: {handler: vi.fn()},
    });
    const subscriptions = countSubscriptions();

    rerender({handler: vi.fn()});

    expect(countSubscriptions()).toBe(subscriptions);
  });

  it('stops listening once unmounted', () => {
    const removeEventListener = vi.spyOn(document, 'removeEventListener');
    const {unmount} = renderHook(() => useKeyDown(vi.fn()));

    unmount();

    expect(removeEventListener).toHaveBeenCalledExactlyOnceWith(
      'keydown',
      expect.any(Function),
    );
  });
});
