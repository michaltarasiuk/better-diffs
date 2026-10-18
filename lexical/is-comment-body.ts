import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {createEditor, type SerializedEditorState} from 'lexical';

import {isDefined} from '#/utils/is-defined';

const editor = createEditor({
  namespace: 'CommentBody',
  nodes: [HeadingNode, QuoteNode],
  onError(error) {
    throw error;
  },
});

export function isCommentBody(value: unknown): value is SerializedEditorState {
  if (!isDefined(value) || typeof value !== 'object') {
    return false;
  }

  try {
    return !editor.parseEditorState(value as SerializedEditorState).isEmpty();
  } catch {
    return false;
  }
}
