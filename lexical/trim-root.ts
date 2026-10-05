import type {LexicalNode} from 'lexical';
import {$getRoot, $isElementNode, $isLineBreakNode, $isTextNode} from 'lexical';

import {isDefined} from '@/utils/is-defined';

function $isBlank(node: LexicalNode) {
  return (
    $isLineBreakNode(node) ||
    ($isTextNode(node) && node.getTextContent().trim() === '') ||
    ($isElementNode(node) && node.isEmpty())
  );
}

export function $trimRoot() {
  const root = $getRoot();

  for (
    let node = root.getFirstDescendant();
    isDefined(node);
    node = root.getFirstDescendant()
  ) {
    if (!$isBlank(node)) {
      if ($isTextNode(node)) {
        node.setTextContent(node.getTextContent().trimStart());
      }
      break;
    }
    node.remove();
  }

  for (
    let node = root.getLastDescendant();
    isDefined(node);
    node = root.getLastDescendant()
  ) {
    if (!$isBlank(node)) {
      if ($isTextNode(node)) {
        node.setTextContent(node.getTextContent().trimEnd());
      }
      break;
    }
    node.remove();
  }
}
