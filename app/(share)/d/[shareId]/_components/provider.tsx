'use client';

import {createContext, useRef} from 'react';
import type {CodeViewHandle} from '@pierre/diffs/react';

import {useLocalStorage} from '@/hooks/use-local-storage';
import {newId} from '@/utils/new-id';
import {deserializeMap, serializeMap} from '@/utils/serialize-map';
import {
  type AnnotationMetadata,
  type DiffLine,
  type FormDiffAnnotation,
  sortAnnotations,
} from '@/diffs/annotations';
import {DiffProvider} from '@/diffs/provider';
import {useShareId} from '../_hooks/use-share-id';

type Handle = CodeViewHandle<AnnotationMetadata, null>;

interface FileState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly version: number;
}

function defaultFileState(): FileState {
  return {
    commentForms: [],
    collapsed: false,
    viewed: false,
    version: 0,
  };
}

export const HandleContext = createContext<React.RefObject<Handle | null>>(
  null as never,
);

export const FileStateContext = createContext<ReturnType<typeof useFileState>>(
  null as never,
);

export function CodeViewProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const handleRef = useRef<CodeViewHandle<AnnotationMetadata, null>>(null);

  return (
    <DiffProvider>
      <HandleContext value={handleRef}>{children}</HandleContext>
    </DiffProvider>
  );
}

export function FileStateProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const fileState = useFileState();

  return <FileStateContext value={fileState}>{children}</FileStateContext>;
}

function useFileState() {
  const shareId = useShareId();
  const [fileStates, setFileStates] = useLocalStorage(
    `share:${shareId}`,
    () => new Map<string, FileState>(),
    {
      serialize: serializeMap<string, FileState>,
      deserialize: deserializeMap<string, FileState>,
    },
  );

  function getFileState(fileId: string) {
    return {...defaultFileState(), ...fileStates.get(fileId)};
  }

  function updateFileState(
    fileId: string,
    update: (state: FileState) => FileState,
  ) {
    setFileStates((fs) => {
      const state = {...defaultFileState(), ...fs.get(fileId)};

      return new Map(fs).set(fileId, {
        ...update(state),
        version: state.version + 1,
      });
    });
  }

  function toggleFileCollapsed(fileId: string) {
    updateFileState(fileId, (state) => ({
      ...state,
      collapsed: !state.collapsed,
    }));
  }

  function setFileViewed(fileId: string, viewed: boolean) {
    updateFileState(fileId, (state) => ({
      ...state,
      viewed,
      collapsed: viewed,
    }));
  }

  function toggleFileViewed(fileId: string) {
    updateFileState(fileId, (state) => ({
      ...state,
      viewed: !state.viewed,
      collapsed: !state.viewed,
    }));
  }

  function addCommentForm(fileId: string, line: DiffLine) {
    updateFileState(fileId, (state) => ({
      ...state,
      commentForms: sortAnnotations([
        ...state.commentForms,
        {
          ...line,
          metadata: {
            type: 'form',
            formId: newId(),
          },
        },
      ]),
    }));
  }

  function removeCommentForm(fileId: string, formId: string) {
    updateFileState(fileId, (state) => ({
      ...state,
      commentForms: state.commentForms.filter(
        (commentForm) => commentForm.metadata.formId !== formId,
      ),
    }));
  }

  return {
    getFileState,
    toggleFileCollapsed,
    setFileViewed,
    toggleFileViewed,
    addCommentForm,
    removeCommentForm,
  };
}
