'use client';

import {
  Button,
  ButtonGroup,
  Card,
  type Key,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
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
  type EditorThemeClasses,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  REDO_COMMAND,
  type TextFormatType,
  UNDO_COMMAND,
} from 'lexical';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from 'lucide-react';
import {useEffect, useEffectEvent, useState} from 'react';

import {isPresent} from '@/lib/utils/is-present';

const BLOCK_TYPES = [
  {label: 'Normal', value: 'paragraph'},
  {label: 'Heading 1', value: 'h1'},
  {label: 'Heading 2', value: 'h2'},
  {label: 'Heading 3', value: 'h3'},
  {label: 'Quote', value: 'quote'},
] as const;

const FORMAT_TYPES = ['bold', 'italic', 'underline', 'strikethrough'] as const;

const EDITOR_THEME = {
  heading: {
    h1: 'typography--h4',
    h2: 'typography--h5',
    h3: 'typography--h6',
  },
  paragraph: 'typography--body-sm',
  quote: 'border-border text-muted border-s-4 ps-4 italic',
  text: {
    bold: 'font-semibold text-foreground',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
} satisfies EditorThemeClasses;

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

function isBlockType(value: string): value is BlockType {
  return BLOCK_TYPES.some((block) => block.value === value);
}

interface EditorProps {
  readonly onDismiss?: () => void;
}

export function Editor({onDismiss}: EditorProps) {
  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'Better Diffs',
        nodes: [HeadingNode, QuoteNode],
        theme: EDITOR_THEME,
        onError(error) {
          console.error(error);
        },
      }}
    >
      <Card variant="secondary" className="ms-2 me-2 mbs-1 mbe-2">
        <Card.Header>
          <ToolbarPlugin />
        </Card.Header>
        <Card.Content>
          <div className="rounded-field relative min-h-24 px-3 py-2">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-label="Comment"
                  aria-placeholder="Leave a comment…"
                  placeholder={
                    <div className="typography typography--body-sm text-field-placeholder pointer-events-none absolute inset-0 px-3 py-2">
                      Leave a comment…
                    </div>
                  }
                  className="typography typography--body-sm min-h-24 outline-none"
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </Card.Content>
        <Card.Footer className="flex items-center justify-end gap-2">
          {isPresent(onDismiss) && (
            <Button variant="ghost" size="sm" onPress={onDismiss}>
              Cancel
            </Button>
          )}
          <Button size="sm">Comment</Button>
        </Card.Footer>
      </Card>

      <AutoFocusPlugin />
      <HistoryPlugin />
    </LexicalComposer>
  );
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const [blockType, setBlockType] = useState<BlockType>('paragraph');

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [selectedTextFormats, setSelectedTextFormats] = useState(
    () => new Set<Key>(),
  );

  const $updateToolbar = useEffectEvent(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let topLevelElement = $findMatchingParent(anchorNode, (e) => {
        const parent = e.getParent();
        return isPresent(parent) && $isRootOrShadowRoot(parent);
      });
      topLevelElement ??= anchorNode.getTopLevelElementOrThrow();

      const nextBlockType = $isHeadingNode(topLevelElement)
        ? topLevelElement.getTag()
        : topLevelElement.getType();
      if (isBlockType(nextBlockType)) {
        setBlockType(nextBlockType);
      }

      const formats = new Set<Key>(
        FORMAT_TYPES.filter((format) => selection.hasFormat(format)),
      );
      setSelectedTextFormats(formats);
    }
  });

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(
          () => {
            $updateToolbar();
          },
          {editor},
        );
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
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
        onChange={(key) => {
          if (typeof key === 'string' && isBlockType(key)) {
            applyBlockType(editor, key);
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
            {BLOCK_TYPES.map(({label, value}) => (
              <ListBox.Item key={value} id={value} textValue={label}>
                {label}
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
        selectedKeys={selectedTextFormats}
        onSelectionChange={(nextTextFormats) => {
          const toggled =
            nextTextFormats.symmetricDifference(selectedTextFormats);
          for (const format of toggled) {
            editor.dispatchCommand(
              FORMAT_TEXT_COMMAND,
              format as TextFormatType,
            );
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
        <ToggleButton id="strikethrough" aria-label="Strikethrough" isIconOnly>
          <ToggleButtonGroup.Separator />
          <StrikethroughIcon aria-hidden className="size-4" />
        </ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup selectionMode="single" size="sm">
        <ToggleButton
          id="left"
          aria-label="Align left"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
          isIconOnly
        >
          <AlignLeftIcon aria-hidden className="size-4" />
        </ToggleButton>
        <ToggleButton
          id="center"
          aria-label="Align center"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
          isIconOnly
        >
          <ToggleButtonGroup.Separator />
          <AlignCenterIcon aria-hidden className="size-4" />
        </ToggleButton>
        <ToggleButton
          id="right"
          aria-label="Align right"
          onPress={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
          isIconOnly
        >
          <ToggleButtonGroup.Separator />
          <AlignRightIcon aria-hidden className="size-4" />
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}
