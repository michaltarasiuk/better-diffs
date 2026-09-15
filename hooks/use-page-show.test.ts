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

    expect(onPageShow).toHaveBeenCalledWith(
      expect.objectContaining({persisted: true}),
    );
  });

  it('calls the newest handler without resubscribing', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const countSubscriptions = () =>
      addEventListener.mock.calls.filter(([type]) => type === 'pageshow')
        .length;
    const first = vi.fn();
    const second = vi.fn();

    const {rerender} = renderHook(({handler}) => usePageShow(handler), {
      initialProps: {handler: first},
    });
    const subscriptions = countSubscriptions();
    rerender({handler: second});

    showPage();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(countSubscriptions()).toBe(subscriptions);

    addEventListener.mockRestore();
  });

  it('stops listening once unmounted', () => {
    const onPageShow = vi.fn();
    const {unmount} = renderHook(() => usePageShow(onPageShow));

    unmount();
    showPage();

    expect(onPageShow).not.toHaveBeenCalled();
  });
});
