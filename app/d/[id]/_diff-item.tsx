'use client';

import '@/lib/diffs/diffs.module.css';

import {Button, Card, TextArea} from '@heroui/react';
import {
  type FileDiffMetadata,
  type GetHoveredLineResult,
  getLineAnnotationName,
} from '@pierre/diffs';
import {FileDiff} from '@pierre/diffs/react';
import {LogInIcon, PlusIcon, SendIcon} from 'lucide-react';
import {createContext, use, useState} from 'react';

import type {AnnotationMetadata, LineAnnotation} from '@/lib/diffs/annotation';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';
import {useKeyDown} from '@/lib/hooks/use-key-down';
import {focusRef} from '@/lib/utils/focus-ref';
import {isPresent} from '@/lib/utils/is-present';

const AnnotationIdContext = createContext<string>(null as never);

interface DiffItemProps {
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
  readonly initialLineAnnotations?: LineAnnotation[];
}

export function DiffItem({
  fileDiff,
  prerenderedHTML,
  initialLineAnnotations = [],
}: DiffItemProps) {
  const [lineAnnotations, setLineAnnotations] = useState<LineAnnotation[]>(
    initialLineAnnotations,
  );

  function addFormAnnotation({lineNumber, side}: GetHoveredLineResult<'diff'>) {
    setLineAnnotations((la) => [
      ...la,
      {
        lineNumber,
        side,
        metadata: {
          type: 'form',
        },
      },
    ]);
  }

  function dismissFormAnnotation(annotation: LineAnnotation) {
    setLineAnnotations((la) => la.filter((a) => a !== annotation));
  }

  return (
    <FileDiff
      fileDiff={fileDiff}
      prerenderedHTML={prerenderedHTML}
      lineAnnotations={lineAnnotations}
      options={{
        ...DIFF_VIEWER_OPTIONS,
        enableGutterUtility: true,
        enableLineSelection: true,
      }}
      renderGutterUtility={(getHoveredLine) => {
        return (
          <GutterUtility
            onAddAnnotation={() => {
              const hoveredLine = getHoveredLine();
              if (isPresent(hoveredLine)) {
                addFormAnnotation(hoveredLine);
              } else {
                console.error('No hovered line');
              }
            }}
          />
        );
      }}
      renderAnnotation={(annotation) => {
        return (
          <AnnotationIdContext value={getLineAnnotationName(annotation)}>
            <Annotation
              metadata={annotation.metadata}
              onDismissForm={() => dismissFormAnnotation(annotation)}
            />
          </AnnotationIdContext>
        );
      }}
    />
  );
}

interface GutterUtilityProps {
  readonly onAddAnnotation: () => void;
}

function GutterUtility({onAddAnnotation}: GutterUtilityProps) {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      isIconOnly
      onPress={onAddAnnotation}
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
    >
      <PlusIcon aria-hidden="true" className="size-4" />
    </Button>
  );
}

interface AnnotationProps {
  readonly metadata: AnnotationMetadata;
  readonly onDismissForm: () => void;
}

function Annotation({metadata, onDismissForm}: AnnotationProps) {
  useKeyDown((event) => {
    if (event.key === 'Escape' && metadata.type === 'form') {
      onDismissForm();
    }
  });

  switch (metadata.type) {
    case 'form':
      return <CommentForm onCancel={onDismissForm} />;
    case 'thread':
      return <ThreadAnnotation />;
    default:
      metadata.type satisfies never;
  }
}

interface CommentFormProps {
  readonly onCancel: () => void;
}

function CommentForm({onCancel}: CommentFormProps) {
  const [message, setMessage] = useState('');

  const id = use(AnnotationIdContext);
  const session = use(SessionContext);

  if (!isPresent(session)) {
    return (
      <Card variant="secondary" className="ms-2 me-2 mbs-1 mbe-2">
        <SignInPrompt />
      </Card>
    );
  }

  return (
    <Card
      aria-label="New comment"
      variant="secondary"
      className="ms-2 me-2 mbs-1 mbe-2"
    >
      <Card.Content>
        <TextArea
          ref={focusRef}
          id={id}
          name="comment"
          aria-label="Comment"
          placeholder="Leave a comment…"
          value={message}
          rows={3}
          variant="secondary"
          fullWidth
          onChange={(event) => setMessage(event.target.value)}
          className="min-h-24 resize-none"
        />
      </Card.Content>
      <Card.Footer className="justify-end gap-2">
        <Button
          id={`${id}-cancel`}
          size="sm"
          variant="ghost"
          onPress={onCancel}
        >
          Cancel
        </Button>
        <Button id={`${id}-submit`} size="sm">
          <SendIcon aria-hidden="true" className="size-4" />
          Comment
        </Button>
      </Card.Footer>
    </Card>
  );
}

function SignInPrompt() {
  const id = use(AnnotationIdContext);

  return (
    <>
      <Card.Header>
        <Card.Title>Sign in to comment</Card.Title>
        <Card.Description>
          Connect your GitHub account to leave comments on this diff.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button
          id={`${id}-signin`}
          size="sm"
          variant="tertiary"
          fullWidth
          onPress={() =>
            void authClient.signIn.social({
              provider: 'github',
              callbackURL: window.location.href,
            })
          }
        >
          <LogInIcon aria-hidden="true" className="size-4" />
          Continue with GitHub
        </Button>
      </Card.Footer>
    </>
  );
}

function ThreadAnnotation() {
  return <div>Thread Annotation</div>;
}
