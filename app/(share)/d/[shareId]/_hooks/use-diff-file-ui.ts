import type {GetHoveredLineResult} from '@pierre/diffs';

import {useLocalStorage} from '@/hooks/use-local-storage';
import {newId} from '@/utils/id';
import {deserializeMap, serializeMap} from '@/utils/serialize-map';
import {type FormDiffAnnotation, sortAnnotations} from '@/diffs/annotations';

type DiffLine = GetHoveredLineResult<'diff'>;

interface DiffFileUiState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly localVersion: number;
}

const DEFAULT_FILE_UI_STATE = {
  commentForms: [],
  collapsed: false,
  viewed: false,
  localVersion: 0,
} satisfies DiffFileUiState;

export function useDiffFileUi(shareId: string) {
  const [fileUiById, setFileUiById] = useLocalStorage(
    `diff:v1:${shareId}`,
    () => new Map<string, DiffFileUiState>(),
    {
      serialize: serializeMap<string, DiffFileUiState>,
      deserialize: deserializeMap<string, DiffFileUiState>,
    },
  );

  function getFileUi(fileId: string) {
    return {...DEFAULT_FILE_UI_STATE, ...fileUiById.get(fileId)};
  }

  function updateFileUi(
    fileId: string,
    update: (state: DiffFileUiState) => DiffFileUiState,
  ) {
    setFileUiById((byId) => {
      const state = {...DEFAULT_FILE_UI_STATE, ...byId.get(fileId)};

      return new Map(byId).set(fileId, {
        ...update(state),
        localVersion: state.localVersion + 1,
      });
    });
  }

  function toggleFileCollapsed(fileId: string) {
    updateFileUi(fileId, (state) => ({
      ...state,
      collapsed: !state.collapsed,
    }));
  }

  function setFileViewed(fileId: string, viewed: boolean) {
    updateFileUi(fileId, (state) => ({
      ...state,
      viewed,
      collapsed: viewed,
    }));
  }

  function addCommentForm(fileId: string, line: DiffLine) {
    updateFileUi(fileId, (state) => ({
      ...state,
      commentForms: sortAnnotations([
        ...state.commentForms,
        {
          ...line,
          metadata: {type: 'form', formId: newId()},
        },
      ]),
    }));
  }

  function removeCommentForm(fileId: string, formId: string) {
    updateFileUi(fileId, (state) => ({
      ...state,
      commentForms: state.commentForms.filter(
        (commentForm) => commentForm.metadata.formId !== formId,
      ),
    }));
  }

  return {
    getFileUi,
    toggleFileCollapsed,
    setFileViewed,
    addCommentForm,
    removeCommentForm,
  };
}
