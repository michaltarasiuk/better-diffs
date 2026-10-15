import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension, type SerializedEditorState} from 'lexical';

import {isDefined} from '#/utils/is-defined';

import {EDITOR_THEME} from './editor-theme';

interface CommentExtensionOptions {
  readonly name: string;
  readonly initialState?: SerializedEditorState;
  readonly editable?: boolean;
}

export function defineCommentExtension({
  name,
  initialState,
  editable = true,
}: CommentExtensionOptions) {
  return defineExtension({
    name: `@better-diffs/${name}`,
    namespace: name,
    theme: EDITOR_THEME,
    dependencies: editable
      ? [RichTextExtension, HistoryExtension]
      : [RichTextExtension],
    editable,
    $initialEditorState: isDefined(initialState)
      ? JSON.stringify(initialState)
      : undefined,
    onError(error) {
      console.error(error);
    },
  });
}
