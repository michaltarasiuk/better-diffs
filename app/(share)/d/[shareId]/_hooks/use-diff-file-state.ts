import type {GetHoveredLineResult} from '@pierre/diffs';

import {useLocalStorage} from '@/hooks/use-local-storage';
import {newId} from '@/utils/id';
import {deserializeMap, serializeMap} from '@/utils/serialize-map';
import {type FormDiffAnnotation, sortAnnotations} from '@/diffs/annotations';

type DiffLine = GetHoveredLineResult<'diff'>;

interface DiffFileState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly version: number;
}

const DEFAULT_FILE_STATE = {
  commentForms: [],
  collapsed: false,
  viewed: false,
  version: 0,
} satisfies DiffFileState;

export function useDiffFileState(shareId: string) {
  const [fileStateById, setFileStateById] = useLocalStorage(
    `diff:v1:${shareId}`,
    () => new Map<string, DiffFileState>(),
    {
      serialize: serializeMap<string, DiffFileState>,
      deserialize: deserializeMap<string, DiffFileState>,
    },
  );

  function getFileState(fileId: string) {
    return {...DEFAULT_FILE_STATE, ...fileStateById.get(fileId)};
  }

  function updateFileState(
    fileId: string,
    update: (state: DiffFileState) => DiffFileState,
  ) {
    setFileStateById((byId) => {
      const state = {...DEFAULT_FILE_STATE, ...byId.get(fileId)};

      return new Map(byId).set(fileId, {
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
