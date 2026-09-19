import {describe, expect, it} from 'vitest';

import {
  getTreeOptions,
  orderFilesByTree,
  prepareTreeHandoff,
  type TreeHandoffFile,
} from './handoff';
import {TREES_FOCUS_RING_UNSAFE_CSS} from './unsafe-css';

const FILE_DIFFS = [
  {name: 'README.md', type: 'change'},
  {name: 'a.txt', type: 'change'},
  {name: 'b.txt', type: 'change'},
] as const satisfies readonly TreeHandoffFile[];

const treeHandoff = prepareTreeHandoff(FILE_DIFFS);

describe('prepareTreeHandoff', () => {
  it('sorts paths for the file tree', () => {
    expect(treeHandoff.paths).toEqual(['a.txt', 'b.txt', 'README.md']);
  });

  it('maps each diff to git status entries', () => {
    expect(treeHandoff.gitStatus).toEqual([
      {path: 'README.md', status: 'modified'},
      {path: 'a.txt', status: 'modified'},
      {path: 'b.txt', status: 'modified'},
    ]);
  });

  it.each([
    {type: 'new', status: 'added'},
    {type: 'deleted', status: 'deleted'},
    {type: 'change', status: 'modified'},
    {type: 'rename-pure', status: 'renamed'},
    {type: 'rename-changed', status: 'renamed'},
  ] as const)('maps $type to $status', ({type, status}) => {
    const {gitStatus} = prepareTreeHandoff([{name: 'file.txt', type}]);

    expect(gitStatus).toEqual([{path: 'file.txt', status}]);
  });

  it('returns empty handoff data for no files', () => {
    expect(prepareTreeHandoff([])).toEqual({
      paths: [],
      gitStatus: [],
    });
  });
});

describe('orderFilesByTree', () => {
  it.each([
    {
      name: 'reorders files to match the tree',
      files: [{name: 'README.md'}, {name: 'b.txt'}, {name: 'a.txt'}],
      expected: [{name: 'a.txt'}, {name: 'b.txt'}, {name: 'README.md'}],
    },
    {
      name: 'leaves already sorted files alone',
      files: [{name: 'a.txt'}, {name: 'b.txt'}, {name: 'README.md'}],
      expected: [{name: 'a.txt'}, {name: 'b.txt'}, {name: 'README.md'}],
    },
    {
      name: 'pushes unknown files after known ones',
      files: [{name: 'c.txt'}, {name: 'a.txt'}],
      expected: [{name: 'a.txt'}, {name: 'c.txt'}],
    },
    {
      name: 'keeps relative order among unknown files',
      files: [{name: 'z.txt'}, {name: 'y.txt'}, {name: 'a.txt'}],
      expected: [{name: 'a.txt'}, {name: 'z.txt'}, {name: 'y.txt'}],
    },
  ])('$name', ({files, expected}) => {
    expect(orderFilesByTree(files, treeHandoff)).toEqual(expected);
  });

  it('preserves extra fields on file objects', () => {
    const files = [
      {name: 'b.txt', id: 'b'},
      {name: 'a.txt', id: 'a'},
    ];

    expect(orderFilesByTree(files, treeHandoff)).toEqual([
      {name: 'a.txt', id: 'a'},
      {name: 'b.txt', id: 'b'},
    ]);
  });

  it('returns a new array without mutating the input', () => {
    const files = [{name: 'README.md'}, {name: 'a.txt'}];
    const ordered = orderFilesByTree(files, treeHandoff);

    expect(ordered).not.toBe(files);
    expect(files).toEqual([{name: 'README.md'}, {name: 'a.txt'}]);
  });

  it('returns an empty array for no files', () => {
    expect(orderFilesByTree([], treeHandoff)).toEqual([]);
  });
});

describe('getTreeOptions', () => {
  it('wires handoff data into file tree options', () => {
    expect(getTreeOptions(treeHandoff, {searchQuery: 'txt'})).toMatchObject({
      id: 'diff-file-tree',
      initialExpansion: 'open',
      fileTreeSearchMode: 'hide-non-matches',
      initialSearchQuery: 'txt',
      gitStatus: treeHandoff.gitStatus,
      unsafeCSS: TREES_FOCUS_RING_UNSAFE_CSS,
    });
  });

  it.each([null, 'query'] as const)(
    'passes searchQuery through as initialSearchQuery',
    (searchQuery) => {
      expect(
        getTreeOptions(treeHandoff, {searchQuery}).initialSearchQuery,
      ).toBe(searchQuery);
    },
  );
});
