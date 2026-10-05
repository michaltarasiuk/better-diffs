'use client';

import {createContext, useRef} from 'react';
import type {CodeViewHandle} from '@pierre/diffs/react';
import type {SerializedEditorState} from 'lexical';

import {useLocalStorage} from '@/hooks/use-local-storage';
import {newId} from '@/utils/new-id';
import {deserializeMap, serializeMap} from '@/utils/serialize-map';
import type {AnnotationMetadata, FormDiffAnnotation} from '@/diffs/annotations';
import type {DiffLine} from '@/diffs/lines';
import {DiffProvider} from '@/diffs/provider';
import {useShareId} from '../_hooks/use-share-id';

type Handle = CodeViewHandle<AnnotationMetadata, null>;

type CodeViewRef = React.RefObject<Handle | null>;

interface FileState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly replyDrafts: Readonly<Record<string, SerializedEditorState>>;
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly version: number;
}

type CommentForms = FileState['commentForms'];

type ReplyDrafts = FileState['replyDrafts'];

type FileStatePatch = Partial<Omit<FileState, 'version'>>;

type ReviewState = ReturnType<typeof useReviewState>;

const DEFAULT_FILE_STATE: FileState = {
  commentForms: [],
  replyDrafts: {},
  collapsed: false,
  viewed: false,
  version: 0,
};

export const CodeViewRefContext = createContext<CodeViewRef>(null as never);

export const ReviewStateContext = createContext<ReviewState>(null as never);

export function CodeViewProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const codeViewRef = useRef<Handle>(null);

  return (
    <DiffProvider>
      <CodeViewRefContext value={codeViewRef}>{children}</CodeViewRefContext>
    </DiffProvider>
  );
}

export function ReviewStateProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const reviewState = useReviewState();

  return (
    <ReviewStateContext value={reviewState}>{children}</ReviewStateContext>
  );
}

function useReviewState() {
  const shareId = useShareId();
  const [fileStates, setFileStates] = useLocalStorage(
    `share:v1:${shareId}`,
    () => new Map<string, FileState>(),
    {
      serialize: serializeMap<string, FileState>,
      deserialize: deserializeMap<string, FileState>,
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

  function patchCommentForms(
    fileId: string,
    patch: (commentForms: CommentForms) => CommentForms,
  ) {
    patchFileState(fileId, (state) => ({
      commentForms: patch(state.commentForms),
    }));
  }

  function patchReplyDrafts(
    fileId: string,
    patch: (replyDrafts: ReplyDrafts) => ReplyDrafts,
  ) {
    patchFileState(fileId, (state) => ({
      replyDrafts: patch(state.replyDrafts),
    }));
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

      patchCommentForms(fileId, (commentForms) => [
        ...commentForms,
        commentForm,
      ]);
    },

    setCommentFormDraft(
      fileId: string,
      formId: string,
      draft: SerializedEditorState,
    ) {
      patchCommentForms(fileId, (commentForms) =>
        commentForms.map((commentForm) =>
          commentForm.metadata.formId === formId
            ? {...commentForm, metadata: {...commentForm.metadata, draft}}
            : commentForm,
        ),
      );
    },

    removeCommentForm(fileId: string, formId: string) {
      patchCommentForms(fileId, (commentForms) =>
        commentForms.filter(
          (commentForm) => commentForm.metadata.formId !== formId,
        ),
      );
    },

    setReplyDraft(
      fileId: string,
      threadId: string,
      draft: SerializedEditorState,
    ) {
      patchReplyDrafts(fileId, (replyDrafts) => ({
        ...replyDrafts,
        [threadId]: draft,
      }));
    },

    clearReplyDraft(fileId: string, threadId: string) {
      patchReplyDrafts(
        fileId,
        ({[threadId]: _, ...replyDrafts}) => replyDrafts,
      );
    },
  };
}
