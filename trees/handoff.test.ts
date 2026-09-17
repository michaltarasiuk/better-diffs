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
  {name: 'src/a.ts', type: 'change'},
  {name: 'src/b.ts', type: 'change'},
] as const satisfies readonly TreeHandoffFile[];

const treeHandoff = prepareTreeHandoff(FILE_DIFFS);

describe('prepareTreeHandoff', () => {
  it('sorts paths for the file tree', () => {
    expect(treeHandoff.paths).toEqual(['src/a.ts', 'src/b.ts', 'README.md']);
  });

  it('maps each diff to git status entries', () => {
    expect(treeHandoff.gitStatus).toEqual([
      {path: 'README.md', status: 'modified'},
      {path: 'src/a.ts', status: 'modified'},
      {path: 'src/b.ts', status: 'modified'},
    ]);
  });

  it.each([
    {type: 'new', status: 'added'},
    {type: 'deleted', status: 'deleted'},
    {type: 'change', status: 'modified'},
    {type: 'rename-pure', status: 'renamed'},
    {type: 'rename-changed', status: 'renamed'},
  ] as const)('maps $type to $status', ({type, status}) => {
    const {gitStatus} = prepareTreeHandoff([{name: 'file.ts', type}]);

    expect(gitStatus).toEqual([{path: 'file.ts', status}]);
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
      files: [{name: 'README.md'}, {name: 'src/b.ts'}, {name: 'src/a.ts'}],
      expected: [{name: 'src/a.ts'}, {name: 'src/b.ts'}, {name: 'README.md'}],
    },
    {
      name: 'leaves already sorted files alone',
      files: [{name: 'src/a.ts'}, {name: 'src/b.ts'}, {name: 'README.md'}],
      expected: [{name: 'src/a.ts'}, {name: 'src/b.ts'}, {name: 'README.md'}],
    },
    {
      name: 'pushes unknown files after known ones',
      files: [{name: 'src/c.ts'}, {name: 'src/a.ts'}],
      expected: [{name: 'src/a.ts'}, {name: 'src/c.ts'}],
    },
    {
      name: 'keeps relative order among unknown files',
      files: [{name: 'z.ts'}, {name: 'y.ts'}, {name: 'src/a.ts'}],
      expected: [{name: 'src/a.ts'}, {name: 'z.ts'}, {name: 'y.ts'}],
    },
  ])('$name', ({files, expected}) => {
    expect(orderFilesByTree(files, treeHandoff)).toEqual(expected);
  });

  it('preserves extra fields on file objects', () => {
    const files = [
      {name: 'src/b.ts', id: 'b'},
      {name: 'src/a.ts', id: 'a'},
    ];

    expect(orderFilesByTree(files, treeHandoff)).toEqual([
      {name: 'src/a.ts', id: 'a'},
      {name: 'src/b.ts', id: 'b'},
    ]);
  });

  it('returns a new array without mutating the input', () => {
    const files = [{name: 'README.md'}, {name: 'src/a.ts'}];
    const ordered = orderFilesByTree(files, treeHandoff);

    expect(ordered).not.toBe(files);
    expect(files).toEqual([{name: 'README.md'}, {name: 'src/a.ts'}]);
  });

  it('returns an empty array for no files', () => {
    expect(orderFilesByTree([], treeHandoff)).toEqual([]);
  });
});

describe('getTreeOptions', () => {
  it('wires handoff data into file tree options', () => {
    expect(getTreeOptions(treeHandoff, {searchQuery: 'src'})).toMatchObject({
      id: 'diff-file-tree',
      initialExpansion: 'open',
      fileTreeSearchMode: 'hide-non-matches',
      initialSearchQuery: 'src',
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
