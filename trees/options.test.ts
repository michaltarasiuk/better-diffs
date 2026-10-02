import {describe, expect, it} from 'vitest';

import {prepareTreeInput} from './input';
import {getFileTreeOptions} from './options';

const treeInput = prepareTreeInput([
  {name: 'README.md', type: 'change'},
  {name: 'src/a.ts', type: 'new'},
]);

describe('getFileTreeOptions', () => {
  it('prepares the sorted paths as presorted input', () => {
    const {preparedInput} = getFileTreeOptions(treeInput, {searchQuery: null});

    expect(preparedInput.paths).toEqual(treeInput.paths);
  });

  it('passes git status through', () => {
    const {gitStatus} = getFileTreeOptions(treeInput, {searchQuery: null});

    expect(gitStatus).toBe(treeInput.gitStatus);
  });

  it.each([null, 'query'])(
    'passes searchQuery %j through as initialSearchQuery',
    (searchQuery) => {
      const {initialSearchQuery} = getFileTreeOptions(treeInput, {searchQuery});

      expect(initialSearchQuery).toBe(searchQuery);
    },
  );
});
