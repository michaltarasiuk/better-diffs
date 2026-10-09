'use client';

import '@/trees/trees.css';

import {SearchField} from '@heroui/react';
import type {FileTree as FileTreeModel} from '@pierre/trees';
import {
  FileTree,
  type FileTreePreloadedData,
  useFileTree,
  useFileTreeSearch,
} from '@pierre/trees/react';
import {use, useRef} from 'react';

import {useShortcut} from '@/hooks/use-shortcut';
import type {TreeInput} from '@/trees/input';
import {getFileTreeOptions} from '@/trees/options';
import {isDefined} from '@/utils/is-defined';

import {useSearchQuery} from '../_hooks/use-search-query';
import {scrollToFile} from '../_lib/scroll-to-file';
import {CodeViewRefContext} from './code-view-provider';

interface FileTreePanelProps {
  readonly input: TreeInput;
  readonly preloaded: FileTreePreloadedData;
  readonly fileIdByPath: Readonly<Record<string, string>>;
  readonly children: React.ReactNode;
}

export function FileTreePanel({
  input,
  preloaded,
  fileIdByPath,
  children,
}: FileTreePanelProps) {
  const {searchQuery, setSearchQuery} = useSearchQuery();
  const codeViewRef = use(CodeViewRefContext);
  const {model} = useFileTree({
    ...getFileTreeOptions(input, {searchQuery}),
    onSearchChange(value) {
      void setSearchQuery(value);
    },
    onSelectionChange([selectedPath]) {
      const codeView = codeViewRef.current;
      if (
        !isDefined(codeView) ||
        !isDefined(selectedPath) ||
        selectedPath.endsWith('/')
      ) {
        return;
      }

      const fileId = fileIdByPath[selectedPath];
      if (!isDefined(fileId)) {
        throw new Error(`File not found: ${selectedPath}`);
      }

      scrollToFile(codeView, fileId);
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <FileTreeSearch model={model} />

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

function FileTreeSearch({model}: {readonly model: FileTreeModel}) {
  const search = useFileTreeSearch(model);
  const inputRef = useRef<HTMLInputElement>(null);

  useShortcut('/', function focusSearch() {
    const input = inputRef.current;
    if (!isDefined(input)) {
      throw new Error('Invalid search input');
    }
    input.focus();
    input.select();
  });

  return (
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
          ref={inputRef}
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
                event.currentTarget.blur();
                break;
            }
          }}
        />
        <SearchField.ClearButton aria-label="Clear search" />
      </SearchField.Group>
    </SearchField>
  );
}
