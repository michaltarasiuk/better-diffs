// @vitest-environment jsdom

import {renderHook} from '@testing-library/react';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

import {useShortcut} from './use-shortcut';

function pressKey(
  target: EventTarget,
  key: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

describe('useShortcut', () => {
  it('runs the handler and prevents the default action', () => {
    const onShortcut = vi.fn();
    renderHook(() => useShortcut('v', onShortcut));

    const event = pressKey(document.body, 'v');

    expect(onShortcut).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores other keys', () => {
    const onShortcut = vi.fn();
    renderHook(() => useShortcut('v', onShortcut));

    const event = pressKey(document.body, 'k');

    expect(onShortcut).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('ignores the key with a modifier held', () => {
    const onShortcut = vi.fn();
    renderHook(() => useShortcut('v', onShortcut));

    pressKey(document.body, 'v', {metaKey: true});

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it('ignores auto-repeated presses of a held key', () => {
    const onShortcut = vi.fn();
    renderHook(() => useShortcut('v', onShortcut));

    pressKey(document.body, 'v', {repeat: true});

    expect(onShortcut).not.toHaveBeenCalled();
  });

  it('ignores the key while typing in an input', () => {
    const onShortcut = vi.fn();
    renderHook(() => useShortcut('v', onShortcut));
    const input = document.body.appendChild(document.createElement('input'));
    onTestFinished(() => input.remove());

    const event = pressKey(input, 'v');

    expect(onShortcut).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
