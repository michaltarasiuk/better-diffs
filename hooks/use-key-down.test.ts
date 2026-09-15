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

    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onKeyDown).toHaveBeenCalledWith(expect.any(KeyboardEvent));
  });

  it('calls the newest handler without resubscribing', () => {
    const addEventListener = vi.spyOn(document, 'addEventListener');
    const countSubscriptions = () =>
      addEventListener.mock.calls.filter(([type]) => type === 'keydown').length;
    const first = vi.fn();
    const second = vi.fn();

    const {rerender} = renderHook(({handler}) => useKeyDown(handler), {
      initialProps: {handler: first},
    });
    const subscriptions = countSubscriptions();
    rerender({handler: second});

    pressKey('k');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(countSubscriptions()).toBe(subscriptions);

    addEventListener.mockRestore();
  });

  it('stops listening once unmounted', () => {
    const onKeyDown = vi.fn();
    const {unmount} = renderHook(() => useKeyDown(onKeyDown));

    unmount();
    pressKey('k');

    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
