'use client';

import type {AnnotationSide, DiffLineAnnotation} from '@pierre/diffs/react';

import {Button, Card, TextArea, TextField} from '@heroui/react';
import {FileDiff} from '@pierre/diffs/react';
import {LogInIcon, PlusIcon, SendIcon} from 'lucide-react';
import {use, useState} from 'react';

import type {PreloadedDiffItem} from '@/lib/diffs/preload';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {STATIC_DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';
import {useOnEscape} from '@/lib/hooks/use-on-escape';
import {focusRef} from '@/lib/utils/focus-ref';
import {isDefined} from '@/lib/utils/is-defined';

interface AnnotationMetadata {
  type: 'form' | 'thread';
}

interface HoveredLine {
  lineNumber: number;
  side: AnnotationSide;
}

export function DiffItem({
  fileDiff,
  prerenderedHTML,
}: Pick<PreloadedDiffItem, 'fileDiff' | 'prerenderedHTML'>) {
  const [lineAnnotations, setLineAnnotations] = useState<
    DiffLineAnnotation<AnnotationMetadata>[]
  >([]);

  const hasFormAnnotation = lineAnnotations.some(
    (a) => a.metadata.type === 'form',
  );

  function addFormAnnotation({lineNumber, side}: HoveredLine) {
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
        ...STATIC_DIFF_VIEWER_OPTIONS,
        enableGutterUtility: !hasFormAnnotation,
        enableLineSelection: !hasFormAnnotation,
      }}
      renderGutterUtility={(getHoveredLine) => {
        return (
          <GutterUtility
            onAddAnnotation={() => {
              const hoveredLine = getHoveredLine();
              if (isDefined(hoveredLine)) {
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

function GutterUtility({onAddAnnotation}: {onAddAnnotation: () => void}) {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      onPress={onAddAnnotation}
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
      isIconOnly
    >
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}

function Annotation({
  metadata,
  onDismissForm,
}: {
  metadata: AnnotationMetadata;
  onDismissForm: () => void;
}) {
  useOnEscape(() => {
    if (metadata.type === 'form') {
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

function CommentForm({onCancel}: {onCancel: () => void}) {
  const session = use(SessionContext);
  const [message, setMessage] = useState('');

  if (!isDefined(session)) {
    return (
      <Card variant="secondary" className="mx-2 mt-1 mb-2">
        <SignInPrompt />
      </Card>
    );
  }

  return (
    <Card variant="secondary" className="mx-2 mt-1 mb-2">
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
            placeholder="Leave a comment..."
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
          <SendIcon aria-hidden className="size-4" />
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
          <LogInIcon aria-hidden className="size-4" />
          Continue with GitHub
        </Button>
      </Card.Footer>
    </>
  );
}

function ThreadAnnotation() {
  return <div>Thread Annotation</div>;
}
