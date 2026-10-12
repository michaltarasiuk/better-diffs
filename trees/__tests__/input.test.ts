import {describe, expect, it} from 'vitest';

import {prepareTreeInput, sortByTree, type TreeInputFile} from '../input';

describe('prepareTreeInput', () => {
  it('maps file types to git statuses', () => {
    const files = [
      {name: 'a.ts', type: 'new'},
      {name: 'b.ts', type: 'deleted'},
      {name: 'c.ts', type: 'change'},
      {name: 'd.ts', type: 'rename-pure'},
      {name: 'e.ts', type: 'rename-changed'},
    ] satisfies TreeInputFile[];

    expect(prepareTreeInput(files).gitStatus).toEqual([
      {path: 'a.ts', status: 'added'},
      {path: 'b.ts', status: 'deleted'},
      {path: 'c.ts', status: 'modified'},
      {path: 'd.ts', status: 'renamed'},
      {path: 'e.ts', status: 'renamed'},
    ]);
  });

  it('includes every file path', () => {
    const files = [
      {name: 'src/z.ts', type: 'change'},
      {name: 'README.md', type: 'change'},
      {name: 'src/lib/a.ts', type: 'change'},
    ] satisfies TreeInputFile[];

    const {paths} = prepareTreeInput(files);

    expect(paths).toEqual(expect.arrayContaining(files.map(({name}) => name)));
  });
});

describe('sortByTree', () => {
  it('orders files by their position in the tree', () => {
    const files = [
      {name: 'README.md', type: 'change'},
      {name: 'src/z.ts', type: 'change'},
      {name: 'src/lib/a.ts', type: 'change'},
    ] satisfies TreeInputFile[];
    const input = prepareTreeInput(files);
    const filePaths = input.paths.filter((path) =>
      files.some(({name}) => name === path),
    );

    expect(sortByTree(files, input).map(({name}) => name)).toEqual(filePaths);
  });

  it('puts files missing from the tree last', () => {
    const input = {paths: ['b.ts', 'a.ts'], gitStatus: []};
    const files = [{name: 'missing.ts'}, {name: 'a.ts'}, {name: 'b.ts'}];

    expect(sortByTree(files, input).map(({name}) => name)).toEqual([
      'b.ts',
      'a.ts',
      'missing.ts',
    ]);
  });
});
