import type {CodeView} from '@pierre/diffs';
import {describe, expect, it} from 'vitest';

import type {AnnotationMetadata} from '@/diffs/annotations';

import {getViewportFileId} from '../get-viewport-file-id';

interface FakeItem {
  readonly id: string;
  readonly top: number | undefined;
  readonly height: number;
  readonly collapsed?: boolean;
}

function codeView(
  items: readonly FakeItem[],
  {scrollTop = 0, height = 100} = {},
) {
  const tops = new Map(items.map(({id, top}) => [id, top]));
  return {
    getScrollTop: () => scrollTop,
    getHeight: () => height,
    getTopForItem: (id: string) => tops.get(id),
    getRenderedItems: () =>
      items.map(({id, height, collapsed = false}) => ({
        id,
        item: {collapsed},
        instance: {getVirtualizedHeight: () => height},
      })),
  } as unknown as CodeView<AnnotationMetadata, null>;
}

describe('getViewportFileId', () => {
  it('returns null without rendered items', () => {
    expect(getViewportFileId(codeView([]))).toBe(null);
  });

  it('returns the first expanded file in the viewport', () => {
    const view = codeView(
      [
        {id: 'above', top: 0, height: 50},
        {id: 'first', top: 50, height: 100},
        {id: 'second', top: 150, height: 100},
      ],
      {scrollTop: 100},
    );

    expect(getViewportFileId(view)).toBe('first');
  });

  it('skips files that only touch the viewport edges', () => {
    const view = codeView(
      [
        {id: 'above', top: 0, height: 100},
        {id: 'inside', top: 100, height: 100},
        {id: 'below', top: 200, height: 100},
      ],
      {scrollTop: 100},
    );

    expect(getViewportFileId(view)).toBe('inside');
  });

  it('prefers an expanded file over collapsed ones before it', () => {
    const view = codeView([
      {id: 'collapsed-1', top: 0, height: 20, collapsed: true},
      {id: 'collapsed-2', top: 20, height: 20, collapsed: true},
      {id: 'expanded', top: 40, height: 200},
    ]);

    expect(getViewportFileId(view)).toBe('expanded');
  });

  it('falls back to the first collapsed file in the viewport', () => {
    const view = codeView([
      {id: 'collapsed-1', top: 0, height: 20, collapsed: true},
      {id: 'collapsed-2', top: 20, height: 20, collapsed: true},
    ]);

    expect(getViewportFileId(view)).toBe('collapsed-1');
  });

  it('ignores items without a known position', () => {
    const view = codeView([
      {id: 'unpositioned', top: undefined, height: 100},
      {id: 'positioned', top: 0, height: 100},
    ]);

    expect(getViewportFileId(view)).toBe('positioned');
  });

  it('returns null when nothing intersects the viewport', () => {
    const view = codeView([{id: 'far', top: 500, height: 100}]);

    expect(getViewportFileId(view)).toBe(null);
  });
});
