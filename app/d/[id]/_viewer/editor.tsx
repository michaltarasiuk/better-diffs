import {Button, Card} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {useLexicalIsTextContentEmpty} from '@lexical/react/useLexicalIsTextContentEmpty';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {
  COMMAND_PRIORITY_BEFORE_EDITOR,
  KEY_ESCAPE_COMMAND,
  type EditorThemeClasses,
  type SerializedEditorState,
} from 'lexical';
import {useEffect, useTransition} from 'react';

import {ToolbarPlugin} from './editor-toolbar';

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
          await onComment(editor.getEditorState().toJSON());
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
