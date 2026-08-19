'use client';

import '@/lib/diffs/diffs.module.css';

import type {FileDiffMetadata, GetHoveredLineResult} from '@pierre/diffs';
import type {DiffLineAnnotation} from '@pierre/diffs/react';

import {Button, Card, TextArea, TextField} from '@heroui/react';
import {FileDiff} from '@pierre/diffs/react';
import {LogInIcon, PlusIcon, SendIcon} from 'lucide-react';
import {use, useState} from 'react';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';
import {useKeyDown} from '@/lib/hooks/use-key-down';
import {focusRef} from '@/lib/utils/focus-ref';
import {isPresent} from '@/lib/utils/is-present';

interface AnnotationMetadata {
  readonly type: 'form' | 'thread';
}

interface DiffItemProps {
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
}

export function DiffItem({fileDiff, prerenderedHTML}: DiffItemProps) {
  const [lineAnnotations, setLineAnnotations] = useState<
    DiffLineAnnotation<AnnotationMetadata>[]
  >([]);

  const hasFormAnnotation = lineAnnotations.some(
    (a) => a.metadata.type === 'form',
  );

  function addFormAnnotation({lineNumber, side}: GetHoveredLineResult<'diff'>) {
    setLineAnnotations((la) => [
      ...la.filter((a) => a.metadata.type !== 'form'),
      {
        lineNumber,
        side,
        metadata: {
          type: 'form',
        },
      },
    ]);
  }

  function dismissFormAnnotation() {
    setLineAnnotations((la) => la.filter((a) => a.metadata.type !== 'form'));
  }

  return (
    <FileDiff
      fileDiff={fileDiff}
      prerenderedHTML={prerenderedHTML}
      lineAnnotations={lineAnnotations}
      options={{
        ...DIFF_VIEWER_OPTIONS,
        enableGutterUtility: !hasFormAnnotation,
        enableLineSelection: !hasFormAnnotation,
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
      renderAnnotation={({metadata}) => {
        return (
          <Annotation
            metadata={metadata}
            onDismissForm={dismissFormAnnotation}
          />
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
      onPress={onAddAnnotation}
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
      isIconOnly
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
  const session = use(SessionContext);
  const [message, setMessage] = useState('');

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
        <TextField
          name="comment"
          aria-label="Comment"
          value={message}
          onChange={setMessage}
          fullWidth
        >
          <TextArea
            ref={focusRef}
            placeholder="Leave a comment…"
            variant="secondary"
            rows={3}
            className="min-h-24 w-full resize-none"
          />
        </TextField>
      </Card.Content>
      <Card.Footer className="justify-end gap-2">
        <Button variant="ghost" size="sm" onPress={onCancel}>
          Cancel
        </Button>
        <Button size="sm">
          <SendIcon aria-hidden="true" className="size-4" />
          Comment
        </Button>
      </Card.Footer>
    </Card>
  );
}

function SignInPrompt() {
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
          variant="tertiary"
          size="sm"
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
