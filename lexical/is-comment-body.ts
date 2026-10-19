import {buildEditorFromExtensions} from '@lexical/extension';
import type {SerializedEditorState} from 'lexical';

import {isObject} from '#/utils/is-object';

import {CommentExtension} from './comment-extension';

const editor = buildEditorFromExtensions(CommentExtension);

export function isCommentBody(value: unknown): value is SerializedEditorState {
  if (!isObject(value)) {
    return false;
  }

  try {
    return !editor.parseEditorState(value as SerializedEditorState).isEmpty();
  } catch {
    return false;
  }
}
