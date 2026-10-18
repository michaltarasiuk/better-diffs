import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from 'lexical';

export function commentBody(text: string) {
  const editor = createEditor();
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)));
    },
    {discrete: true},
  );
  return editor.getEditorState().toJSON();
}
