import {
  Button,
  ButtonGroup,
  Card,
  ListBox,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  type Key,
} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {useLexicalIsTextContentEmpty} from '@lexical/react/useLexicalIsTextContentEmpty';
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
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  KEY_ESCAPE_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type EditorThemeClasses,
  type LexicalEditor,
  type SerializedEditorState,
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
import {useEffect, useEffectEvent, useState, useTransition} from 'react';

import {isDefined} from '@/lib/utils/defined';

const bodySmTypography = typographyVariants({type: 'body-sm'});

const EDITOR_THEME = {
  heading: {
    h1: typographyVariants({type: 'h4'}).base(),
    h2: typographyVariants({type: 'h5'}).base(),
    h3: typographyVariants({type: 'h6'}).base(),
  },
  paragraph: bodySmTypography.base(),
  quote: 'border-border text-muted border-s-4 ps-4 italic',
  text: {
    bold: 'font-semibold text-foreground',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
  },
} satisfies EditorThemeClasses;

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

function isBlockType(value: string): value is BlockType {
  return BLOCK_TYPES.some((blockType) => blockType.value === value);
}

type OnComment = (body: SerializedEditorState) => void | Promise<unknown>;

interface DiffEditorProps {
  readonly onComment: OnComment;
  readonly onDismiss: () => void;
}

export function DiffEditor({onComment, onDismiss}: DiffEditorProps) {
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
      <Card variant="secondary" className="m-2 mbs-1">
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
                    <div
                      className={bodySmTypography.base({
                        className:
                          'text-field-placeholder pointer-events-none absolute inset-0 px-3 py-2',
                      })}
                    >
                      Leave a comment…
                    </div>
                  }
                  className={bodySmTypography.base({
                    className: 'max-h-24 min-h-24 overflow-y-auto outline-none',
                  })}
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </Card.Content>
        <Card.Footer className="flex flex-wrap-reverse items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onDismiss}>
            Cancel
          </Button>
          <CommentButton onComment={onComment} />
        </Card.Footer>
      </Card>

      <HistoryPlugin />
      <PreventEscapeBlurPlugin />
    </LexicalComposer>
  );
}

interface CommentButtonProps {
  readonly onComment: OnComment;
}

function CommentButton({onComment}: CommentButtonProps) {
  const [editor] = useLexicalComposerContext();
  const isEmpty = useLexicalIsTextContentEmpty(editor, true);

  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      isDisabled={isEmpty}
      isPending={isPending}
      onPress={() => {
        startTransition(async () => {
          const editorState = editor.getEditorState();
          await onComment(editorState.toJSON());
        });
      }}
    >
      Comment
    </Button>
  );
}

function PreventEscapeBlurPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => true,
      COMMAND_PRIORITY_BEFORE_EDITOR,
    );
  }, [editor]);

  return null;
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();

  const [blockType, setBlockType] = useState<BlockType>('paragraph');

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [textFormats, setTextFormats] = useState(() => new Set<Key>());

  const $updateToolbar = useEffectEvent(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const formats = new Set<Key>(
        FORMAT_TYPES.filter((formatType) => selection.hasFormat(formatType)),
      );
      setTextFormats(formats);

      const anchorNode = selection.anchor.getNode();
      let topLevelElement = $findMatchingParent(anchorNode, (node) => {
        const parent = node.getParent();
        return isDefined(parent) && $isRootOrShadowRoot(parent);
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
        onChange={(value) => {
          if (typeof value === 'string' && isBlockType(value)) {
            applyBlockType(editor, value);
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
            {BLOCK_TYPES.map((blockType) => (
              <ListBox.Item
                key={blockType.value}
                id={blockType.value}
                textValue={blockType.label}
              >
                {blockType.label}
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
          for (const formatType of toggled) {
            editor.dispatchCommand(
              FORMAT_TEXT_COMMAND,
              formatType as TextFormatType,
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
