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
import {useRef} from 'react';

import {useKeyDown} from '@/lib/hooks/use-key-down';
import {getDiffTreeOptions, type DiffTreeHandoff} from '@/lib/trees/handoff';
import {isDirectoryPath} from '@/lib/trees/paths';
import {isDefined} from '@/lib/utils/defined';
import {setHash} from '@/lib/utils/hash';

import {diffSearchParsers} from './_search-params.parsers';

interface DiffTreeProps {
  readonly handoff: DiffTreeHandoff;
  readonly preloadedData: FileTreePreloadedData;
  readonly children: React.ReactNode;
}

export function DiffTree({handoff, preloadedData, children}: DiffTreeProps) {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    diffSearchParsers.q.withOptions({history: 'replace'}),
  );
  const {model} = useFileTree({
    ...getDiffTreeOptions(handoff),
    initialSearchQuery: searchQuery,
    onSearchChange(v) {
      void setSearchQuery(v);
    },
    onSelectionChange([s, ...rest]) {
      const singleSelection = isDefined(s) && rest.length === 0;
      if (!singleSelection || isDirectoryPath(s)) {
        return;
      }
      setHash(s);
    },
  });
  const search = useFileTreeSearch(model);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyDown((e) => {
    if (
      e.key !== '/' ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      isEditableTarget(e.target)
    ) {
      return;
    }
    e.preventDefault();
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SearchField
        variant="secondary"
        aria-label="Search files"
        value={search.value}
        onChange={(v) => search.setValue(v || null)}
        fullWidth
        className="bg-trees-sidebar p-2"
      >
        <SearchField.Group className="bg-transparent">
          <SearchField.SearchIcon />
          <SearchField.Input
            ref={searchInputRef}
            aria-keyshortcuts="/ Escape"
            placeholder="Search files"
            onKeyDown={(e) => {
              switch (e.key) {
                case 'ArrowUp':
                  e.preventDefault();
                  search.focusPreviousMatch();
                  break;
                case 'ArrowDown':
                  e.preventDefault();
                  search.focusNextMatch();
                  break;
                case 'Escape':
                  e.preventDefault();
                  search.setValue(null);
                  e.currentTarget.blur();
                  break;
              }
            }}
          />
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

      {children}
    </div>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}
