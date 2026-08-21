'use client';

import '@/lib/trees/trees.module.css';

import {SearchField} from '@heroui/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSearch,
  type FileTreePreloadedData,
} from '@pierre/trees/react';
import {useQueryState} from 'nuqs';

import {getDiffTreeOptions, type DiffTreeHandoff} from '@/lib/trees/handoff';
import {isDirectoryPath} from '@/lib/trees/is-directory-path';
import {isDefined} from '@/lib/utils/is-defined';
import {setHash} from '@/lib/utils/set-hash';

import {diffSearchParsers} from './_search-params';

interface DiffTreeProps {
  readonly handoff: DiffTreeHandoff;
  readonly preloadedData: FileTreePreloadedData;
}

export function DiffTree({handoff, preloadedData}: DiffTreeProps) {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    diffSearchParsers.q.withOptions({history: 'replace'}),
  );
  const {model} = useFileTree({
    ...getDiffTreeOptions(handoff),
    initialSearchQuery: searchQuery,
    onSearchChange(value) {
      void setSearchQuery(value);
    },
    onSelectionChange([selected, ...rest]) {
      const singleSelection = isDefined(selected) && rest.length === 0;
      if (!singleSelection || isDirectoryPath(selected)) {
        return;
      }
      setHash(selected);
    },
  });
  const search = useFileTreeSearch(model);

  return (
    <div className="flex h-full flex-col">
      <SearchField
        aria-label="Search files"
        value={search.value}
        onChange={(value) => search.setValue(value || null)}
        className="bg-trees-sidebar p-2"
      >
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search files" />
          <SearchField.ClearButton
            aria-label="Clear search"
            onClick={() => search.setValue(null)}
          />
        </SearchField.Group>
      </SearchField>

      <FileTree
        aria-label="Changed files"
        model={model}
        preloadedData={preloadedData}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
