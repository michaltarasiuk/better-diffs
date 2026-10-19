import {KeyboardShortcutsExtension} from '@lexical/extension';
import {
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  CONTROL_OR_META,
  createCommand,
  type KeyboardEventModifierMask,
  type KeyboardShortcut,
  type KeyboardShortcutMatch,
  type LexicalEditor,
} from 'lexical';

const CONTROL_OR_META_ALT = {...CONTROL_OR_META, altKey: true};
const CONTROL_OR_META_SHIFT = {...CONTROL_OR_META, shiftKey: true};

function bind(
  key: string,
  modifiers: KeyboardEventModifierMask,
): KeyboardShortcut {
  return {key, modifiers, command: createCommand<KeyboardEvent>()};
}

const BOUND_SHORTCUTS = {
  submit: bind('Enter', CONTROL_OR_META),
  paragraph: bind('0', CONTROL_OR_META_ALT),
  h1: bind('1', CONTROL_OR_META_ALT),
  h2: bind('2', CONTROL_OR_META_ALT),
  h3: bind('3', CONTROL_OR_META_ALT),
  quote: bind('q', CONTROL_OR_META_ALT),
  left: bind('l', CONTROL_OR_META_SHIFT),
  center: bind('e', CONTROL_OR_META_SHIFT),
  right: bind('r', CONTROL_OR_META_SHIFT),
  justify: bind('j', CONTROL_OR_META_SHIFT),
};

export const SHORTCUTS = {
  ...BOUND_SHORTCUTS,
  bold: {key: 'b', modifiers: CONTROL_OR_META},
  italic: {key: 'i', modifiers: CONTROL_OR_META},
  underline: {key: 'u', modifiers: CONTROL_OR_META},
  undo: {key: 'z', modifiers: CONTROL_OR_META},
  redo: {key: 'z', modifiers: CONTROL_OR_META_SHIFT},
  dismiss: {key: 'Escape'},
} satisfies Record<string, KeyboardShortcutMatch>;

export const ShortcutsExtension = configExtension(KeyboardShortcutsExtension, {
  shortcuts: BOUND_SHORTCUTS,
});

export function registerShortcut(
  editor: LexicalEditor,
  {command}: KeyboardShortcut,
  onShortcut: () => void,
) {
  return editor.registerCommand(
    command,
    (event) => {
      event.preventDefault();
      onShortcut();
      return true;
    },
    COMMAND_PRIORITY_EDITOR,
  );
}

const ARIA_MODIFIERS = [
  ['ctrlKey', 'Control'],
  ['altKey', 'Alt'],
  ['shiftKey', 'Shift'],
  ['metaKey', 'Meta'],
] as const;

export function formatAriaKeyShortcuts({
  key,
  modifiers = {},
}: KeyboardShortcutMatch) {
  return [
    ...ARIA_MODIFIERS.filter(([modifier]) => modifiers[modifier] === true).map(
      ([, name]) => name,
    ),
    key,
  ].join('+');
}
