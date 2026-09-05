'use client';

import '@/lib/trees/trees.css';

import {SearchField} from '@heroui/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSearch,
  type FileTreePreloadedData,
} from '@pierre/trees/react';
import {use, useRef} from 'react';

import {useKeyDown} from '@/lib/hooks/use-key-down';
import {getTreeOptions, type TreeHandoff} from '@/lib/trees/handoff';
import {isDefined} from '@/lib/utils/defined';

import {DiffHandleContext} from '../_lib/handle-context';
import {useSearchQuery} from '../_lib/use-search-query';

interface DiffTreeProps {
  readonly handoff: TreeHandoff;
  readonly preloaded: FileTreePreloadedData;
  readonly fileIdByPath: Readonly<Record<string, string>>;
  readonly children: React.ReactNode;
}

export function DiffTree({
  handoff,
  preloaded,
  fileIdByPath,
  children,
}: DiffTreeProps) {
  const {searchQuery, setSearchQuery} = useSearchQuery();
  const handleRef = use(DiffHandleContext);
  const {model} = useFileTree({
    ...getTreeOptions(handoff, {searchQuery}),
    onSearchChange(value) {
      void setSearchQuery(value);
    },
    onSelectionChange([selectedPath]) {
      const id = isDefined(selectedPath) ? fileIdByPath[selectedPath] : null;
      if (isDefined(id)) {
        handleRef.current?.scrollTo({type: 'item', id, align: 'start'});
      }
    },
  });
  const search = useFileTreeSearch(model);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyDown(function focusSearch(event) {
    if (
      event.key !== '/' ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }
    event.preventDefault();
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SearchField
        variant="secondary"
        aria-label="Search files"
        value={search.value}
        onChange={(value) => search.setValue(value || null)}
        fullWidth
        className="bg-trees-sidebar p-2"
      >
        <SearchField.Group className="bg-transparent">
          <SearchField.SearchIcon />
          <SearchField.Input
            ref={searchInputRef}
            aria-keyshortcuts="/ Escape"
            placeholder="Search files"
            onKeyDown={(event) => {
              switch (event.key) {
                case 'ArrowUp':
                  event.preventDefault();
                  search.focusPreviousMatch();
                  break;
                case 'ArrowDown':
                  event.preventDefault();
                  search.focusNextMatch();
                  break;
                case 'Escape':
                  event.preventDefault();
                  search.setValue(null);
                  event.currentTarget.blur();
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
        preloadedData={preloaded}
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
