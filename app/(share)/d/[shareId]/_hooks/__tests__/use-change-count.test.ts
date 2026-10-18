// @vitest-environment jsdom

import {renderHook} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {useChangeCount} from '../use-change-count';

describe('useChangeCount', () => {
  it('starts at zero', () => {
    const {result} = renderHook(() => useChangeCount({}));

    expect(result.current).toBe(0);
  });

  it('keeps the count while the value stays the same', () => {
    const value = {};
    const {result, rerender} = renderHook(({value}) => useChangeCount(value), {
      initialProps: {value},
    });

    rerender({value});

    expect(result.current).toBe(0);
  });

  it('counts up on every change, even back to an earlier value', () => {
    const first = {};
    const second = {};
    const {result, rerender} = renderHook(({value}) => useChangeCount(value), {
      initialProps: {value: first},
    });

    rerender({value: second});
    expect(result.current).toBe(1);

    rerender({value: first});
    expect(result.current).toBe(2);
  });
});
