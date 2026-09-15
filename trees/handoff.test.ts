import {describe, expect, it} from 'vitest';

import {TREES_FOCUS_RING_UNSAFE_CSS} from '@/trees/unsafe-css';
import {getTreeOptions, orderFilesByTree, prepareTreeHandoff} from './handoff';

const DIFFS = [
  {name: 'src/b.ts', type: 'change'},
  {name: 'src/a.ts', type: 'change'},
  {name: 'README.md', type: 'change'},
  {name: 'src/deep/nested/x.ts', type: 'change'},
] as const;

const tree = prepareTreeHandoff(DIFFS);

describe('prepareTreeHandoff', () => {
  it('sorts paths for the tree while keeping git status in diff order', () => {
    expect(tree).toEqual({
      paths: ['src/deep/nested/x.ts', 'src/a.ts', 'src/b.ts', 'README.md'],
      gitStatus: [
        {path: 'src/b.ts', status: 'modified'},
        {path: 'src/a.ts', status: 'modified'},
        {path: 'README.md', status: 'modified'},
        {path: 'src/deep/nested/x.ts', status: 'modified'},
      ],
    });
  });

  it.each([
    ['new', 'added'],
    ['deleted', 'deleted'],
    ['change', 'modified'],
    ['rename-pure', 'renamed'],
    ['rename-changed', 'renamed'],
  ] as const)('maps %s to git status %s', (type, status) => {
    expect(prepareTreeHandoff([{name: 'src/a.ts', type}])).toEqual({
      paths: ['src/a.ts'],
      gitStatus: [{path: 'src/a.ts', status}],
    });
  });
});

describe('orderFilesByTree', () => {
  it('reorders files to match the tree', () => {
    const files = [
      {name: 'README.md', id: 1},
      {name: 'src/deep/nested/x.ts', id: 2},
      {name: 'src/a.ts', id: 3},
    ];

    expect(orderFilesByTree(files, tree)).toEqual([
      {name: 'src/deep/nested/x.ts', id: 2},
      {name: 'src/a.ts', id: 3},
      {name: 'README.md', id: 1},
    ]);
  });

  it('pushes unknown files to the end', () => {
    expect(
      orderFilesByTree([{name: 'untracked.ts'}, {name: 'src/a.ts'}], tree),
    ).toEqual([{name: 'src/a.ts'}, {name: 'untracked.ts'}]);
  });

  it('does not mutate the input array', () => {
    const files = [{name: 'README.md'}, {name: 'src/a.ts'}];
    const ordered = orderFilesByTree(files, tree);

    expect(ordered).not.toBe(files);
    expect(files).toEqual([{name: 'README.md'}, {name: 'src/a.ts'}]);
  });
});

describe('getTreeOptions', () => {
  it('builds tree options from the handoff', () => {
    const options = getTreeOptions(tree, {searchQuery: 'index'});

    expect(options).toMatchObject({
      id: 'diff-file-tree',
      initialExpansion: 'open',
      fileTreeSearchMode: 'hide-non-matches',
      initialSearchQuery: 'index',
      gitStatus: tree.gitStatus,
      unsafeCSS: TREES_FOCUS_RING_UNSAFE_CSS,
    });
    expect(options.preparedInput).toMatchObject({
      paths: tree.paths,
      presortedPaths: tree.paths,
      presortedPathsContainDirectories: false,
    });
  });

  it('passes through a null search query', () => {
    expect(getTreeOptions(tree, {searchQuery: null})).toMatchObject({
      initialSearchQuery: null,
    });
  });
});
