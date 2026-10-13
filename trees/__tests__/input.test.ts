import {describe, expect, it} from 'vitest';

import {prepareTreeInput, sortByTree, type TreeInputFile} from '../input';

describe('prepareTreeInput', () => {
  it('maps file types to git statuses', () => {
    const files = [
      {name: 'a.txt', type: 'new'},
      {name: 'b.txt', type: 'deleted'},
      {name: 'c.txt', type: 'change'},
      {name: 'd.txt', type: 'rename-pure'},
      {name: 'e.txt', type: 'rename-changed'},
    ] satisfies TreeInputFile[];

    expect(prepareTreeInput(files).gitStatus).toEqual([
      {path: 'a.txt', status: 'added'},
      {path: 'b.txt', status: 'deleted'},
      {path: 'c.txt', status: 'modified'},
      {path: 'd.txt', status: 'renamed'},
      {path: 'e.txt', status: 'renamed'},
    ]);
  });

  it('includes every file path', () => {
    const files = [
      {name: 'a/c.txt', type: 'change'},
      {name: 'b.txt', type: 'change'},
      {name: 'a/b/a.txt', type: 'change'},
    ] satisfies TreeInputFile[];

    const {paths} = prepareTreeInput(files);

    expect(paths).toEqual(expect.arrayContaining(files.map(({name}) => name)));
  });
});

describe('sortByTree', () => {
  it('orders files by their position in the tree', () => {
    const files = [
      {name: 'b.txt', type: 'change'},
      {name: 'a/c.txt', type: 'change'},
      {name: 'a/b/a.txt', type: 'change'},
    ] satisfies TreeInputFile[];
    const input = prepareTreeInput(files);
    const filePaths = input.paths.filter((path) =>
      files.some(({name}) => name === path),
    );

    expect(sortByTree(files, input).map(({name}) => name)).toEqual(filePaths);
  });

  it('puts files missing from the tree last', () => {
    const input = {paths: ['b.txt', 'a.txt'], gitStatus: []};
    const files = [{name: 'missing.txt'}, {name: 'a.txt'}, {name: 'b.txt'}];

    expect(sortByTree(files, input).map(({name}) => name)).toEqual([
      'b.txt',
      'a.txt',
      'missing.txt',
    ]);
  });
});
