'use client';

import type {SerializedEditorState} from 'lexical';
import {createContext} from 'react';

import type {FormDiffAnnotation} from '@/diffs/annotations';
import type {DiffLine} from '@/diffs/lines';
import {useLocalStorage} from '@/hooks/use-local-storage';
import {jsonToMap, mapToJson} from '@/utils/map';
import {newId} from '@/utils/new-id';

import {useShareId} from '../_hooks/use-share-id';

interface FileState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly version: number;
}

type FileStatePatch = Partial<Omit<FileState, 'version'>>;

type Drafts = Readonly<Record<string, SerializedEditorState>>;

type ReviewState = ReturnType<typeof useReviewState>;

type DraftsState = ReturnType<typeof useDrafts>;

const DEFAULT_FILE_STATE: FileState = {
  commentForms: [],
  collapsed: false,
  viewed: false,
  version: 0,
};

export const ReviewStateContext = createContext<ReviewState>(null as never);

export const DraftsContext = createContext<DraftsState>(null as never);

export function ReviewStateProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const drafts = useDrafts();
  const reviewState = useReviewState(drafts.clearDraft);

  return (
    <ReviewStateContext value={reviewState}>
      <DraftsContext value={drafts}>{children}</DraftsContext>
    </ReviewStateContext>
  );
}

function useReviewState(clearDraft: (id: string) => void) {
  const shareId = useShareId();
  const [fileStates, setFileStates] = useLocalStorage(
    `share:v1:${shareId}`,
    () => new Map<string, FileState>(),
    {
      serialize: mapToJson<string, FileState>,
      deserialize: jsonToMap<string, FileState>,
    },
  );

  function patchFileState(
    fileId: string,
    patch: (state: FileState) => FileStatePatch,
  ) {
    setFileStates((fs) => {
      const state = {...DEFAULT_FILE_STATE, ...fs.get(fileId)};

      return new Map(fs).set(fileId, {
        ...state,
        ...patch(state),
        version: state.version + 1,
      });
    });
  }

  return {
    getFileState(fileId: string) {
      return {...DEFAULT_FILE_STATE, ...fileStates.get(fileId)};
    },

    toggleFileCollapsed(fileId: string) {
      patchFileState(fileId, (state) => ({
        collapsed: !state.collapsed,
      }));
    },

    setFileViewed(fileId: string, viewed: boolean) {
      patchFileState(fileId, () => ({
        viewed,
        collapsed: viewed,
      }));
    },

    toggleFileViewed(fileId: string) {
      patchFileState(fileId, (state) => ({
        viewed: !state.viewed,
        collapsed: !state.viewed,
      }));
    },

    addCommentForm(fileId: string, line: DiffLine) {
      const commentForm: FormDiffAnnotation = {
        ...line,
        metadata: {type: 'form', formId: newId()},
      };

      patchFileState(fileId, (state) => ({
        commentForms: [...state.commentForms, commentForm],
      }));
    },

    removeCommentForm(fileId: string, formId: string) {
      patchFileState(fileId, (state) => ({
        commentForms: state.commentForms.filter(
          (commentForm) => commentForm.metadata.formId !== formId,
        ),
      }));
      clearDraft(formId);
    },
  };
}

function useDrafts() {
  const shareId = useShareId();
  const [drafts, setDrafts] = useLocalStorage<Drafts>(
    `share:v1:${shareId}:drafts`,
    () => ({}),
  );

  return {
    getDraft(id: string) {
      return drafts[id];
    },

    setDraft(id: string, draft: SerializedEditorState) {
      setDrafts((ds) => ({...ds, [id]: draft}));
    },

    clearDraft(id: string) {
      setDrafts(({[id]: _, ...ds}) => ds);
    },
  };
}
