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
import {isDefined} from '@/utils/defined';
import {getTreeOptions, type TreeHandoff} from '@/trees/handoff';
import {useSearchQuery} from '../_hooks/use-search-query';
import {HandleContext} from '../_lib/handle-context';

interface FilesPanelProps {
  readonly handoff: TreeHandoff;
  readonly preloaded: FileTreePreloadedData;
  readonly fileIdByPath: Readonly<Record<string, string>>;
  readonly children: React.ReactNode;
}

export function FilesPanel({
  handoff,
  preloaded,
  fileIdByPath,
  children,
}: FilesPanelProps) {
  const {searchQuery, setSearchQuery} = useSearchQuery();
  const handleRef = use(HandleContext);
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
