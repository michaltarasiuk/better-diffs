import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type LexicalNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {$trimRoot} from './trim-root';

function trim(...blocks: (() => LexicalNode[])[]) {
  const editor = createEditor({
    onError(error) {
      throw error;
    },
  });
  editor.update(
    () => {
      $getRoot().append(
        ...blocks.map((children) =>
          $createParagraphNode().append(...children()),
        ),
      );
    },
    {discrete: true},
  );
  editor.update($trimRoot, {discrete: true});
  return editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((block) => block.getTextContent()),
  );
}

describe('$trimRoot', () => {
  it('trims whitespace around the text', () => {
    expect(trim(() => [$createTextNode('  value \t')])).toEqual(['value']);
  });

  it('removes blank leading and trailing paragraphs', () => {
    expect(
      trim(
        () => [],
        () => [$createTextNode('   ')],
        () => [$createTextNode(' first')],
        () => [],
        () => [$createTextNode('last ')],
        () => [],
      ),
    ).toEqual(['first', '', 'last']);
  });

  it('removes leading and trailing line breaks', () => {
    expect(
      trim(() => [
        $createLineBreakNode(),
        $createTextNode(' a'),
        $createLineBreakNode(),
        $createTextNode('b '),
        $createLineBreakNode(),
      ]),
    ).toEqual(['a\nb']);
  });

  it('trims across adjacent text nodes', () => {
    expect(
      trim(() => [
        $createTextNode('  '),
        $createTextNode(' a ').toggleFormat('bold'),
        $createTextNode('  '),
      ]),
    ).toEqual(['a']);
  });
});
