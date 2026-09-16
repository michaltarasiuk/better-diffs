// @vitest-environment jsdom

import {renderHook} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {usePageShow} from './use-page-show';

function showPage(persisted = false) {
  window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted}));
}

describe('usePageShow', () => {
  it('forwards the event to the handler', () => {
    const onPageShow = vi.fn();
    renderHook(() => usePageShow(onPageShow));

    showPage();

    expect(onPageShow).toHaveBeenCalledExactlyOnceWith(
      expect.any(PageTransitionEvent),
    );
  });

  it('tells the handler when the page came from the back/forward cache', () => {
    const onPageShow = vi.fn();
    renderHook(() => usePageShow(onPageShow));

    showPage(true);

    expect(onPageShow).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({persisted: true}),
    );
  });

  it('forwards page show events to the newest handler after a rerender', () => {
    const first = vi.fn();
    const second = vi.fn();

    const {rerender} = renderHook(({handler}) => usePageShow(handler), {
      initialProps: {handler: first},
    });
    rerender({handler: second});

    showPage();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith(
      expect.any(PageTransitionEvent),
    );
  });

  it('keeps a single listener when the handler changes', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const countSubscriptions = () =>
      addEventListener.mock.calls.filter(([type]) => type === 'pageshow')
        .length;

    const {rerender} = renderHook(({handler}) => usePageShow(handler), {
      initialProps: {handler: vi.fn()},
    });
    const subscriptions = countSubscriptions();

    rerender({handler: vi.fn()});

    expect(countSubscriptions()).toBe(subscriptions);
  });

  it('stops listening once unmounted', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const {unmount} = renderHook(() => usePageShow(vi.fn()));

    unmount();

    expect(removeEventListener).toHaveBeenCalledExactlyOnceWith(
      'pageshow',
      expect.any(Function),
    );
  });
});
