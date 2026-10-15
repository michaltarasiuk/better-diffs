'use client';

import type {SerializedEditorState} from 'lexical';
import {createContext, use} from 'react';

import type {FormDiffAnnotation} from '#/diffs/annotations';
import type {DiffLine} from '#/diffs/lines';
import {useLocalStorage} from '#/hooks/use-local-storage';
import {isDefined} from '#/utils/is-defined';
import {jsonToMap, mapToJson} from '#/utils/map';
import {newId} from '#/utils/new-id';

import {useShareId} from '../_hooks/use-share-id';

interface FileState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly version: number;
}

type FileStatePatch = Partial<Omit<FileState, 'version'>>;

type Drafts = Readonly<Record<string, SerializedEditorState>>;

type ReviewState = ReturnType<typeof useStoredReviewState>;

type DraftsState = ReturnType<typeof useStoredDrafts>;

const DEFAULT_FILE_STATE: FileState = {
  commentForms: [],
  collapsed: false,
  viewed: false,
  version: 0,
};

const ReviewStateContext = createContext<ReviewState | null>(null);

const DraftsContext = createContext<DraftsState | null>(null);

export function ReviewStateProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const drafts = useStoredDrafts();
  const reviewState = useStoredReviewState(drafts.clearDraft);

  return (
    <ReviewStateContext value={reviewState}>
      <DraftsContext value={drafts}>{children}</DraftsContext>
    </ReviewStateContext>
  );
}

export function useReviewState() {
  const reviewState = use(ReviewStateContext);
  if (!isDefined(reviewState)) {
    throw new Error('useReviewState must be used within ReviewStateProvider');
  }
  return reviewState;
}

export function useDrafts() {
  const drafts = use(DraftsContext);
  if (!isDefined(drafts)) {
    throw new Error('useDrafts must be used within ReviewStateProvider');
  }
  return drafts;
}

function useStoredReviewState(clearDraft: (id: string) => void) {
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

function useStoredDrafts() {
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
