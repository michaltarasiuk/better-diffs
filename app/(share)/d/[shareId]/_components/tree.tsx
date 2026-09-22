'use client';

import '@/trees/trees.css';

import {use, useRef} from 'react';
import {SearchField} from '@heroui/react';
import {
  FileTree,
  type FileTreePreloadedData,
  useFileTree,
  useFileTreeSearch,
} from '@pierre/trees/react';

import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import {isEditableTarget} from '@/utils/is-editable-target';
import {isUnmodifiedKeyDown} from '@/utils/is-unmodified-key-down';
import {getTreeOptions, type TreeHandoff} from '@/trees/handoff';
import {useQuery} from '../_hooks/use-query';
import {HandleContext} from './provider';

interface TreeProps {
  readonly handoff: TreeHandoff;
  readonly preloaded: FileTreePreloadedData;
  readonly fileIdByPath: Readonly<Record<string, string>>;
  readonly children: React.ReactNode;
}

export function Tree({handoff, preloaded, fileIdByPath, children}: TreeProps) {
  const {searchQuery, setSearchQuery} = useQuery();
  const handleRef = use(HandleContext);
  const {model} = useFileTree({
    ...getTreeOptions(handoff, {searchQuery}),
    onSearchChange(value) {
      void setSearchQuery(value);
    },
    onSelectionChange([selectedPath]) {
      if (!isDefined(selectedPath) || selectedPath.endsWith('/')) {
        return;
      }

      const id = fileIdByPath[selectedPath];
      if (!isDefined(id)) {
        throw new Error(`File not found: ${selectedPath}`);
      }

      handleRef.current?.scrollTo({type: 'item', id, align: 'start'});
    },
  });
  const search = useFileTreeSearch(model);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyDown(function focusSearch(event) {
    if (!isUnmodifiedKeyDown(event, '/') || isEditableTarget(event.target)) {
      return;
    }
    event.preventDefault();
    const searchInput = searchInputRef.current;
    if (!isDefined(searchInput)) {
      throw new Error('Search input missing');
    }
    searchInput.focus();
    searchInput.select();
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
