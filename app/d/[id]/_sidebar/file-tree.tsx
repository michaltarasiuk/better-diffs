'use client';

import '@/lib/trees/trees.css';

import {SearchField} from '@heroui/react';
import {
  FileTree,
  useFileTree,
  useFileTreeSearch,
  type FileTreePreloadedData,
} from '@pierre/trees/react';
import {useQueryState} from 'nuqs';
import {use, useRef} from 'react';

import {useKeyDown} from '@/lib/hooks/use-key-down';
import {getTreeOptions, type TreeHandoff} from '@/lib/trees/handoff';
import {isDefined} from '@/lib/utils/defined';

import {diffSearchParsers} from '../_lib/search-params';
import {DiffViewerContext} from '../_viewer/context';

interface DiffTreeProps {
  readonly handoff: TreeHandoff;
  readonly preloaded: FileTreePreloadedData;
  readonly fileIdsByPath: Readonly<Record<string, string>>;
  readonly children: React.ReactNode;
}

export function DiffTree({
  handoff,
  preloaded,
  fileIdsByPath,
  children,
}: DiffTreeProps) {
  const [searchQuery, setSearchQuery] = useQueryState(
    'q',
    diffSearchParsers.q.withOptions({history: 'replace'}),
  );
  const viewerRef = use(DiffViewerContext);
  const {model} = useFileTree({
    ...getTreeOptions(handoff, {searchQuery}),
    onSearchChange(v) {
      void setSearchQuery(v);
    },
    onSelectionChange(selectedPaths) {
      const [path] = selectedPaths;
      const id = isDefined(path) ? fileIdsByPath[path] : null;
      if (isDefined(id)) {
        viewerRef?.current?.scrollTo({type: 'item', id, align: 'start'});
      }
    },
  });
  const search = useFileTreeSearch(model);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyDown(function focusSearch(e) {
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
