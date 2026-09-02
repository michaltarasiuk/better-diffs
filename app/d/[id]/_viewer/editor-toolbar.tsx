import {
  Button,
  ButtonGroup,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  type Key,
} from '@heroui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $findMatchingParent,
  $getSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
  type TextFormatType,
} from 'lexical';
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  Redo2Icon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react';
import {useEffect, useEffectEvent, useState} from 'react';

import {isDefined} from '@/lib/utils/defined';

const BLOCK_TYPES = [
  {label: 'Normal', value: 'paragraph'},
  {label: 'Heading 1', value: 'h1'},
  {label: 'Heading 2', value: 'h2'},
  {label: 'Heading 3', value: 'h3'},
  {label: 'Quote', value: 'quote'},
] as const;

const FORMAT_TYPES = ['bold', 'italic', 'underline', 'strikethrough'] as const;

type BlockType = (typeof BLOCK_TYPES)[number]['value'];

function formatParagraph(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => $createParagraphNode());
  });
}

function formatHeading(editor: LexicalEditor, headingTag: 'h1' | 'h2' | 'h3') {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => $createHeadingNode(headingTag));
  });
}

function formatQuote(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    $setBlocksType(selection, () => $createQuoteNode());
  });
}

function applyBlockType(editor: LexicalEditor, type: BlockType) {
  if (type === 'paragraph') {
    formatParagraph(editor);
  } else if (type === 'quote') {
    formatQuote(editor);
  } else {
    formatHeading(editor, type);
  }
}

function isBlockType(v: string): v is BlockType {
  return BLOCK_TYPES.some((b) => b.value === v);
}

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const [blockType, setBlockType] = useState<BlockType>('paragraph');

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [textFormats, setTextFormats] = useState(() => new Set<Key>());

  const $updateToolbar = useEffectEvent(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const formats = new Set<Key>(
        FORMAT_TYPES.filter((f) => selection.hasFormat(f)),
      );
      setTextFormats(formats);

      const anchorNode = selection.anchor.getNode();
      let topLevelElement = $findMatchingParent(anchorNode, (n) => {
        const p = n.getParent();
        return isDefined(p) && $isRootOrShadowRoot(p);
      });
      topLevelElement ??= anchorNode.getTopLevelElementOrThrow();

      const nextBlockType = $isHeadingNode(topLevelElement)
        ? topLevelElement.getTag()
        : topLevelElement.getType();
      if (isBlockType(nextBlockType)) {
        setBlockType(nextBlockType);
      }
    }
  });

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState: s}) => {
        s.read(
          () => {
            $updateToolbar();
          },
          {editor},
        );
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (canUndo) => {
          setCanUndo(canUndo);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (canRedo) => {
          setCanRedo(canRedo);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor]);

  return (
    <div className="@container flex flex-wrap items-center gap-2">
      <Select
        aria-label="Block type"
        variant="secondary"
        value={blockType}
        onChange={(v) => {
          if (typeof v === 'string' && isBlockType(v)) {
            applyBlockType(editor, v);
          }
        }}
        className="me-auto w-36 @xl:me-0"
      >
        <Select.Trigger className="h-9 min-h-0 items-center py-0 md:h-8">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {BLOCK_TYPES.map((b) => (
              <ListBox.Item key={b.value} id={b.value} textValue={b.label}>
                {b.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <ButtonGroup variant="tertiary" size="sm">
        <Button
          aria-label="Undo"
          isDisabled={!canUndo}
          onPress={() => {
            editor.dispatchCommand(UNDO_COMMAND);
          }}
          isIconOnly
        >
          <Undo2Icon aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label="Redo"
          isDisabled={!canRedo}
          onPress={() => {
            editor.dispatchCommand(REDO_COMMAND);
          }}
          isIconOnly
        >
          <ButtonGroup.Separator />
          <Redo2Icon aria-hidden className="size-4" />
        </Button>
      </ButtonGroup>

      <ToggleButtonGroup
        selectionMode="multiple"
        size="sm"
        selectedKeys={textFormats}
        onSelectionChange={(selection) => {
          const toggled = selection.symmetricDifference(textFormats);
          for (const f of toggled) {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, f as TextFormatType);
          }
        }}
      >
        <ToggleButton id="bold" aria-label="Bold" isIconOnly>
          <BoldIcon aria-hidden className="size-4" />
        </ToggleButton>
        <ToggleButton id="italic" aria-label="Italic" isIconOnly>
          <ToggleButtonGroup.Separator />
          <ItalicIcon aria-hidden className="size-4" />
        </ToggleButton>
        <ToggleButton id="underline" aria-label="Underline" isIconOnly>
          <ToggleButtonGroup.Separator />
          <UnderlineIcon aria-hidden className="size-4" />
        </ToggleButton>
      </ToggleButtonGroup>

      <ButtonGroup variant="tertiary" size="sm">
        <Button
          aria-label="Align left"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
          isIconOnly
        >
          <AlignLeftIcon aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label="Align center"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
          isIconOnly
        >
          <ButtonGroup.Separator />
          <AlignCenterIcon aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label="Align right"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
          isIconOnly
        >
          <ButtonGroup.Separator />
          <AlignRightIcon aria-hidden className="size-4" />
        </Button>
        <Button
          aria-label="Justify"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
          }}
          isIconOnly
        >
          <ButtonGroup.Separator />
          <AlignJustifyIcon aria-hidden className="size-4" />
        </Button>
      </ButtonGroup>
    </div>
  );
}
