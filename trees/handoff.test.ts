import {describe, expect, it} from 'vitest';

import {orderFilesByTree, prepareTreeHandoff} from './handoff';

const tree = prepareTreeHandoff([
  {name: 'README.md', type: 'change'},
  {name: 'src/a.ts', type: 'change'},
  {name: 'src/b.ts', type: 'change'},
]);

describe('orderFilesByTree', () => {
  it('reorders files to match the tree', () => {
    expect(
      orderFilesByTree(
        [{name: 'README.md'}, {name: 'src/b.ts'}, {name: 'src/a.ts'}],
        tree,
      ),
    ).toEqual([{name: 'src/a.ts'}, {name: 'src/b.ts'}, {name: 'README.md'}]);
  });

  it('pushes unknown files to the end', () => {
    expect(
      orderFilesByTree([{name: 'src/c.ts'}, {name: 'src/a.ts'}], tree),
    ).toEqual([{name: 'src/a.ts'}, {name: 'src/c.ts'}]);
  });

  it('does not mutate the input array', () => {
    const files = [{name: 'README.md'}, {name: 'src/a.ts'}];

    expect(orderFilesByTree(files, tree)).not.toBe(files);
  });
});
