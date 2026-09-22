// @vitest-environment jsdom

import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import * as storageAvailableModule from '@/utils/storage-available';
import {useLocalStorage} from './use-local-storage';

const KEY = 'preference';

interface Preference {
  theme: 'light' | 'dark';
}

function initialPreference() {
  return {theme: 'light'} satisfies Preference;
}

function renderPreferenceHook() {
  return renderHook(() => useLocalStorage<Preference>(KEY, initialPreference));
}

function dispatchStorage(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', {key, newValue}));
}

beforeEach(() => {
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('returns the initial value when nothing is stored', () => {
    const {result} = renderPreferenceHook();

    expect(result.current[0]).toEqual({theme: 'light'});
  });

  it('reads the stored value on mount', () => {
    localStorage.setItem(KEY, JSON.stringify({theme: 'dark'}));

    const {result} = renderPreferenceHook();

    expect(result.current[0]).toEqual({theme: 'dark'});
  });

  it('persists value updates to localStorage', () => {
    const {result} = renderPreferenceHook();

    act(() => {
      result.current[1]({theme: 'dark'});
    });

    expect(result.current[0]).toEqual({theme: 'dark'});
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({theme: 'dark'}));
  });

  it('supports functional updates', () => {
    localStorage.setItem(KEY, JSON.stringify({count: 1}));
    const {result} = renderHook(() => useLocalStorage(KEY, () => ({count: 0})));

    act(() => {
      result.current[1]((i) => ({count: i.count + 1}));
    });

    expect(result.current[0]).toEqual({count: 2});
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({count: 2}));
  });

  it('falls back to the initial value when stored JSON is invalid', () => {
    localStorage.setItem(KEY, 'not-json');

    const {result} = renderPreferenceHook();

    expect(result.current[0]).toEqual({theme: 'light'});
  });

  it('updates when another tab changes the same key', () => {
    const {result} = renderPreferenceHook();

    act(() => {
      dispatchStorage(KEY, JSON.stringify({theme: 'dark'}));
    });

    expect(result.current[0]).toEqual({theme: 'dark'});
  });

  it('ignores storage events for other keys', () => {
    const {result} = renderPreferenceHook();

    act(() => {
      dispatchStorage('other-key', JSON.stringify({theme: 'dark'}));
    });

    expect(result.current[0]).toEqual({theme: 'light'});
  });

  it('resets to the initial value when the key is cleared elsewhere', () => {
    localStorage.setItem(KEY, JSON.stringify({theme: 'dark'}));
    const {result} = renderPreferenceHook();

    act(() => {
      dispatchStorage(KEY, null);
    });

    expect(result.current[0]).toEqual({theme: 'light'});
  });

  it('uses custom serialize and deserialize options', () => {
    const serialize = vi.fn((value: string) => `serialized:${value}`);
    const deserialize = vi.fn((text: string) =>
      text.replace('serialized:', ''),
    );

    localStorage.setItem(KEY, 'serialized:dark');
    const {result} = renderHook(() =>
      useLocalStorage(KEY, () => 'light', {serialize, deserialize}),
    );

    expect(deserialize).toHaveBeenCalledWith('serialized:dark');
    expect(result.current[0]).toBe('dark');

    act(() => {
      result.current[1]('auto');
    });

    expect(serialize).toHaveBeenCalledWith('auto');
    expect(localStorage.getItem(KEY)).toBe('serialized:auto');
  });

  it('returns the initial value when storage is unavailable', () => {
    localStorage.setItem(KEY, JSON.stringify({theme: 'dark'}));
    vi.spyOn(storageAvailableModule, 'storageAvailable').mockReturnValue(false);

    const {result} = renderPreferenceHook();

    expect(result.current[0]).toEqual({theme: 'light'});
  });

  it('does not write to localStorage when storage is unavailable', () => {
    vi.spyOn(storageAvailableModule, 'storageAvailable').mockReturnValue(false);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    const {result} = renderPreferenceHook();

    act(() => {
      result.current[1]({theme: 'dark'});
    });

    expect(result.current[0]).toEqual({theme: 'dark'});
    expect(setItem).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const {unmount} = renderPreferenceHook();

    unmount();

    expect(removeEventListener).toHaveBeenCalledExactlyOnceWith(
      'storage',
      expect.any(Function),
    );
  });
});
