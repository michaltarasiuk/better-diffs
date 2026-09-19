import type {SerializedEditorState} from 'lexical';

export function createLexicalBody(text = 'value'): SerializedEditorState {
  return {text} as unknown as SerializedEditorState;
}
