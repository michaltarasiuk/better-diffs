import {describe, expect, it} from 'vitest';

import type {TreeInputFile} from './input';
import {prepareTreeInput, sortByTree} from './input';

function createTreeInputFile(name: string): TreeInputFile {
  return {name, type: 'change'};
}

const treeInput = prepareTreeInput(
  ['README.md', 'a.txt', 'b.txt'].map(createTreeInputFile),
);

describe('prepareTreeInput', () => {
  it('sorts paths the way the file tree renders them', () => {
    expect(treeInput.paths).toEqual(['a.txt', 'b.txt', 'README.md']);
  });

  it('places directories before sibling files', () => {
    const {paths} = prepareTreeInput(
      ['z.ts', 'src/b.ts', 'src/lib/a.ts'].map(createTreeInputFile),
    );

    expect(paths).toEqual(['src/lib/a.ts', 'src/b.ts', 'z.ts']);
  });

  it('keeps git status entries in input order', () => {
    expect(treeInput.gitStatus).toEqual([
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
    const {gitStatus} = prepareTreeInput([{name: 'file.txt', type}]);

    expect(gitStatus).toEqual([{path: 'file.txt', status}]);
  });

  it('returns empty input for no files', () => {
    expect(prepareTreeInput([])).toEqual({paths: [], gitStatus: []});
  });
});

describe('sortByTree', () => {
  it.each([
    {
      name: 'reorders files to match the tree',
      files: ['README.md', 'b.txt', 'a.txt'],
      expected: ['a.txt', 'b.txt', 'README.md'],
    },
    {
      name: 'leaves already sorted files alone',
      files: ['a.txt', 'b.txt', 'README.md'],
      expected: ['a.txt', 'b.txt', 'README.md'],
    },
    {
      name: 'pushes unknown files after known ones',
      files: ['c.txt', 'a.txt'],
      expected: ['a.txt', 'c.txt'],
    },
    {
      name: 'keeps relative order among unknown files',
      files: ['z.txt', 'y.txt', 'a.txt'],
      expected: ['a.txt', 'z.txt', 'y.txt'],
    },
  ])('$name', ({files, expected}) => {
    const sorted = sortByTree(
      files.map((name) => ({name})),
      treeInput,
    );

    expect(sorted.map(({name}) => name)).toEqual(expected);
  });

  it('follows nested tree order', () => {
    const files = ['z.ts', 'src/b.ts', 'src/lib/a.ts'].map(createTreeInputFile);

    const sorted = sortByTree(files, prepareTreeInput(files));

    expect(sorted.map(({name}) => name)).toEqual([
      'src/lib/a.ts',
      'src/b.ts',
      'z.ts',
    ]);
  });

  it('preserves extra fields on file objects', () => {
    const files = [
      {name: 'b.txt', id: 'b'},
      {name: 'a.txt', id: 'a'},
    ];

    expect(sortByTree(files, treeInput)).toEqual([
      {name: 'a.txt', id: 'a'},
      {name: 'b.txt', id: 'b'},
    ]);
  });

  it('returns a new array without mutating the input', () => {
    const files = [{name: 'README.md'}, {name: 'a.txt'}];

    const sorted = sortByTree(files, treeInput);

    expect(sorted).not.toBe(files);
    expect(files).toEqual([{name: 'README.md'}, {name: 'a.txt'}]);
  });

  it('returns an empty array for no files', () => {
    expect(sortByTree([], treeInput)).toEqual([]);
  });
});
