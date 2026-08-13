'use client';

import './_diff-list.css';

import type {AnnotationSide, DiffLineAnnotation} from '@pierre/diffs/react';

import {Button, Card, Spinner} from '@heroui/react';
import {FileDiff, Virtualizer} from '@pierre/diffs/react';
import {LogInIcon, PlusIcon} from 'lucide-react';
import {useState} from 'react';

import type {PreloadedDiffItem} from '@/lib/diffs';

import {authClient} from '@/lib/auth-client';
import {STATIC_DIFF_VIEWER_OPTIONS} from '@/lib/diffs';
import {isDefined} from '@/lib/is-defined';

interface AnnotationMetadata {
  type: 'form' | 'thread';
}

interface HoveredLine {
  lineNumber: number;
  side: AnnotationSide;
}

export function DiffList({items}: {items: PreloadedDiffItem[]}) {
  authClient.useSession();

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

  return (
    <Virtualizer className="h-full overflow-auto">
      {items.map(({id, fileDiff, prerenderedHTML}) => (
        <FileDiff
          key={id}
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
            return <Annotation metadata={metadata} />;
          }}
        />
      ))}
    </Virtualizer>
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

function Annotation({metadata}: {metadata: AnnotationMetadata}) {
  switch (metadata.type) {
    case 'form':
      return <FormAnnotation />;
    case 'thread':
      return <ThreadAnnotation />;
    default:
      metadata.type satisfies never;
  }
}

function FormAnnotation() {
  const {data: session, isPending} = authClient.useSession();

  if (isPending) {
    return (
      <div className="mx-2 mt-1 mb-2 flex min-h-24 items-center justify-center">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!session) {
    return (
      <Card className="mx-2 mt-1 mb-2" variant="secondary">
        <SignInPrompt />
      </Card>
    );
  }

  return null;
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
          onPress={() => {
            void authClient.signIn.social({
              provider: 'github',
              callbackURL: window.location.href,
            });
          }}
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
