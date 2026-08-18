'use client';

import {SearchField} from '@heroui/react';
import {
  FileTree,
  type FileTreePreloadedData,
  useFileTree,
  useFileTreeSearch,
} from '@pierre/trees/react';
import {useQueryState} from 'nuqs';

import {type DiffTreeHandoff, getDiffTreeOptions} from '@/lib/diffs/tree';

import {diffTreeSearchParsers} from './_search-params';

interface DiffTreeProps {
  readonly handoff: DiffTreeHandoff;
  readonly preloadedData: FileTreePreloadedData;
}

export function DiffTree({handoff, preloadedData}: DiffTreeProps) {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    diffTreeSearchParsers.q.withOptions({history: 'replace'}),
  );
  const {model} = useFileTree({
    ...getDiffTreeOptions(handoff),
    initialSearchQuery: searchQuery,
    onSearchChange(value) {
      void setSearchQuery(value);
    },
  });
  const search = useFileTreeSearch(model);

  return (
    <div className="flex h-full flex-col">
      <SearchField
        value={search.value}
        onChange={(value) => search.setValue(value || null)}
        className="border-b p-2"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search" />
          <SearchField.ClearButton onClick={() => search.setValue(null)} />
        </SearchField.Group>
      </SearchField>
      <FileTree
        model={model}
        preloadedData={preloadedData}
        className="min-h-0 flex-1 pt-2"
      />
    </div>
  );
}
