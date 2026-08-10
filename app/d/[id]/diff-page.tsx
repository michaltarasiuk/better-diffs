'use client';

import {CodeView, type CodeViewDiffItem} from '@pierre/diffs/react';

const CODE_VIEW_OPTIONS = {
  theme: {
    light: 'pierre-light',
    dark: 'pierre-dark',
  },
  stickyHeader: true,
} as const;

const CODE_VIEW_STYLE = {
  height: '100dvh',
  overflow: 'auto',
} as const;

export function DiffPage({items}: {items: CodeViewDiffItem[]}) {
  return (
    <CodeView
      items={items}
      options={CODE_VIEW_OPTIONS}
      style={CODE_VIEW_STYLE}
    />
  );
}
