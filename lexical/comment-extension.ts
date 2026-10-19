import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {
  defineExtension,
  type AnyLexicalExtension,
  type SerializedEditorState,
} from 'lexical';

import {isDefined} from '#/utils/is-defined';

import {EDITOR_THEME} from './editor-theme';
import {ShortcutsExtension} from './shortcuts';

export const CommentExtension = defineExtension({
  name: '@better-diffs/Comment',
  namespace: 'Comment',
  theme: EDITOR_THEME,
  dependencies: [RichTextExtension],
  onError(error) {
    console.error(error);
  },
});

export const CommentBodyExtension = defineExtension({
  name: '@better-diffs/CommentBody',
  dependencies: [CommentExtension],
  editable: false,
});

export const CommentEditorExtension = defineExtension({
  name: '@better-diffs/CommentEditor',
  dependencies: [CommentExtension, HistoryExtension, ShortcutsExtension],
});

export function withInitialState(
  extension: AnyLexicalExtension,
  initialState: SerializedEditorState | undefined,
) {
  return defineExtension({
    name: `${extension.name}/InitialState`,
    dependencies: [extension],
    $initialEditorState: isDefined(initialState)
      ? JSON.stringify(initialState)
      : undefined,
  });
}
