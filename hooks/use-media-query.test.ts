// @vitest-environment jsdom

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {isDefined} from '@/utils/defined';

const BREAKPOINT = '(min-width: 48rem)';

class FakeMediaQueryList extends EventTarget {
  matches = false;
}

let lists: Map<string, FakeMediaQueryList>;
let matchMedia: ReturnType<typeof vi.fn>;

function listFor(query: string) {
  let list = lists.get(query);
  if (!isDefined(list)) {
    list = new FakeMediaQueryList();
    lists.set(query, list);
  }
  return list;
}

/*
 * `useMediaQuery` caches one MediaQueryList per query at module scope, so
 * every test needs a fresh copy of the module to start from a cold cache.
 */
async function importUseIsMobile() {
  const {useIsMobile} = await import('./use-media-query');
  return useIsMobile;
}

function setMatches(matches: boolean) {
  const list = listFor(BREAKPOINT);
  act(() => {
    list.matches = matches;
    list.dispatchEvent(new Event('change'));
  });
}

beforeEach(() => {
  lists = new Map();
  matchMedia = vi.fn(listFor);
  vi.stubGlobal('matchMedia', matchMedia);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsMobile', () => {
  it('reports mobile while the viewport is under the breakpoint', async () => {
    const useIsMobile = await importUseIsMobile();

    const {result} = renderHook(() => useIsMobile());

    expect(matchMedia).toHaveBeenCalledWith(BREAKPOINT);
    expect(result.current).toBe(true);
  });

  it('reports desktop once the breakpoint is met', async () => {
    listFor(BREAKPOINT).matches = true;
    const useIsMobile = await importUseIsMobile();

    const {result} = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('re-renders when the viewport crosses the breakpoint', async () => {
    const useIsMobile = await importUseIsMobile();
    const {result} = renderHook(() => useIsMobile());

    setMatches(true);
    expect(result.current).toBe(false);

    setMatches(false);
    expect(result.current).toBe(true);
  });

  it('shares one MediaQueryList between every caller', async () => {
    const useIsMobile = await importUseIsMobile();

    renderHook(() => useIsMobile());
    renderHook(() => useIsMobile());

    expect(matchMedia).toHaveBeenCalledOnce();
  });

  it('stops listening once the last caller unmounts', async () => {
    const useIsMobile = await importUseIsMobile();
    const removeEventListener = vi.spyOn(
      listFor(BREAKPOINT),
      'removeEventListener',
    );
    const {unmount} = renderHook(() => useIsMobile());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
