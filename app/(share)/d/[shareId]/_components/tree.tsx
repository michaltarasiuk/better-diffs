'use client';

import '@/trees/trees.css';

import {use, useRef} from 'react';
import {SearchField} from '@heroui/react';
import type {FileTree as FileTreeModel} from '@pierre/trees';
import {
  FileTree,
  type FileTreePreloadedData,
  useFileTree,
  useFileTreeSearch,
} from '@pierre/trees/react';

import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import {isEditableTarget} from '@/utils/is-editable-target';
import {isUnmodifiedKey} from '@/utils/is-unmodified-key';
import type {TreeInput} from '@/trees/input';
import {getFileTreeOptions} from '@/trees/options';
import {useQuery} from '../_hooks/use-query';
import {CodeViewRefContext} from './provider';

interface TreeProps {
  readonly input: TreeInput;
  readonly preloaded: FileTreePreloadedData;
  readonly fileIdByPath: Readonly<Record<string, string>>;
  readonly children: React.ReactNode;
}

export function Tree({input, preloaded, fileIdByPath, children}: TreeProps) {
  const {searchQuery, setSearchQuery} = useQuery();
  const codeViewRef = use(CodeViewRefContext);
  const {model} = useFileTree({
    ...getFileTreeOptions(input, {searchQuery}),
    onSearchChange(value) {
      void setSearchQuery(value);
    },
    onSelectionChange([selectedPath]) {
      if (!isDefined(selectedPath) || selectedPath.endsWith('/')) {
        return;
      }
      const fileid = fileIdByPath[selectedPath];
      if (!isDefined(fileid)) {
        throw new Error(`File id not found: ${selectedPath}`);
      }
      codeViewRef.current?.scrollTo({
        type: 'item',
        id: fileid,
        align: 'start',
      });
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TreeSearch model={model} />

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

function TreeSearch({model}: {readonly model: FileTreeModel}) {
  const search = useFileTreeSearch(model);
  const inputRef = useRef<HTMLInputElement>(null);

  useKeyDown(function focusSearch(event) {
    if (!isUnmodifiedKey(event, '/') || isEditableTarget(event.target)) {
      return;
    }
    event.preventDefault();
    const input = inputRef.current;
    if (!isDefined(input)) {
      throw new Error('Search input missing');
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
