'use client';

import {
  Button,
  ButtonGroup,
  Card,
  ListBox,
  Select,
  Spinner,
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

const EDITOR_THEME = {
  heading: {
    h1: typographyVariants({type: 'h4'}).base(),
    h2: typographyVariants({type: 'h5'}).base(),
    h3: typographyVariants({type: 'h6'}).base(),
  },
  paragraph: typographyVariants({type: 'body-sm'}).base(),
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

interface CommentEditorProps {
  readonly onComment: OnComment;
  readonly onDismiss: () => void;
}

export function CommentEditor({onComment, onDismiss}: CommentEditorProps) {
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
      <Card variant="secondary" className="@container m-2 mbs-1">
        <Card.Header>
          <RichTextToolbarPlugin />
        </Card.Header>
        <Card.Content>
          <div className="relative block h-24 w-full rounded-field px-3 py-2">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-label="Comment"
                  aria-placeholder="Leave a comment…"
                  placeholder={
                    <div
                      className={typographyVariants({type: 'body-sm'}).base({
                        className:
                          'pointer-events-none absolute inset-0 px-3 py-2 text-field-placeholder',
                      })}
                    >
                      Leave a comment…
                    </div>
                  }
                  className={typographyVariants({type: 'body-sm'}).base({
                    className: 'h-full w-full overflow-y-auto outline-none',
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
          <SubmitCommentButton onComment={onComment} />
        </Card.Footer>
      </Card>

      <HistoryPlugin />
      <PreventEscapeBlurPlugin />
    </LexicalComposer>
  );
}

interface SubmitCommentButtonProps {
  readonly onComment: OnComment;
}

function SubmitCommentButton({onComment}: SubmitCommentButtonProps) {
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
      {({isPending}) => (
        <>
          {isPending ? <Spinner aria-hidden color="current" size="sm" /> : null}
          {isPending ? 'Posting…' : 'Comment'}
        </>
      )}
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

function RichTextToolbarPlugin() {
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
    <div className="flex [scrollbar-width:none] items-center gap-2 overflow-x-auto">
      <Select
        aria-label="Block type"
        variant="secondary"
        value={blockType}
        onChange={(value) => {
          if (typeof value === 'string' && isBlockType(value)) {
            applyBlockType(editor, value);
          }
        }}
        className="w-36 shrink-0"
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

      <ButtonGroup
        className="ms-auto shrink-0 @xl:ms-0"
        variant="tertiary"
        size="sm"
      >
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
        className="shrink-0"
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

      <ButtonGroup className="shrink-0" variant="tertiary" size="sm">
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
