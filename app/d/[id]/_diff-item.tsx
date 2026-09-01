'use client';

import '@/lib/diffs/diffs.module.css';

import {Button, Card, Spinner} from '@heroui/react';
import {getLineAnnotationName} from '@pierre/diffs';
import {FileDiff} from '@pierre/diffs/react';
import {PlusIcon} from 'lucide-react';
import dynamic from 'next/dynamic';
import {createContext, use, useState} from 'react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {
  DIFF_VIEWER_OPTIONS,
  type AnnotationMetadata,
} from '@/lib/diffs/options';
import {useKeyDown} from '@/lib/hooks/use-key-down';
import {GitHubIcon} from '@/lib/icons/github-icon';
import {isDefined} from '@/lib/utils/defined';

import type {
  DiffLineAnnotation,
  PreloadFileDiffResult,
} from '@pierre/diffs/ssr';

const DiffEditor = dynamic(() =>
  import('./_diff-editor').then((m) => m.DiffEditor),
);

const AnnotationNameContext = createContext<string>(null as never);

interface DiffItemProps {
  preloaded: PreloadFileDiffResult<AnnotationMetadata>;
}

export function DiffItem({preloaded}: DiffItemProps) {
  const [lineAnnotations, setLineAnnotations] = useState<
    DiffLineAnnotation<AnnotationMetadata>[]
  >([]);

  return (
    <FileDiff
      {...preloaded}
      lineAnnotations={lineAnnotations}
      options={{
        ...DIFF_VIEWER_OPTIONS,
        enableGutterUtility: true,
        enableLineSelection: true,
      }}
      renderGutterUtility={(g) => {
        return (
          <GutterUtility
            onAddAnnotation={() => {
              const l = g();
              if (isDefined(l)) {
                const {side, lineNumber} = l;
                setLineAnnotations((la) => [
                  ...la,
                  {side, lineNumber, metadata: {type: 'form'}},
                ]);
              } else {
                console.error('No hovered line');
              }
            }}
          />
        );
      }}
      renderAnnotation={(a) => {
        return (
          <AnnotationNameContext value={getLineAnnotationName(a)}>
            <Annotation
              metadata={a.metadata}
              onDismissForm={() => {
                const {side, lineNumber} = a;
                setLineAnnotations((la) =>
                  la.filter(
                    (a) => side !== a.side || lineNumber !== a.lineNumber,
                  ),
                );
              }}
            />
          </AnnotationNameContext>
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
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}

interface AnnotationProps {
  readonly metadata: AnnotationMetadata;
  readonly onDismissForm: () => void;
}

function Annotation({metadata, onDismissForm}: AnnotationProps) {
  const [isFocusWithin, setFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange: (v) => setFocusWithin(v),
  });

  useKeyDown((e) => {
    if (e.key === 'Escape' && metadata.type === 'form' && isFocusWithin) {
      onDismissForm();
    }
  });

  let annotation: React.ReactNode;
  switch (metadata.type) {
    case 'form':
      annotation = <CommentForm onDismiss={onDismissForm} />;
      break;
    case 'thread':
      annotation = <ThreadAnnotation />;
      break;
    default:
      metadata.type satisfies never;
  }

  return <div {...focusWithinProps}>{annotation}</div>;
}

interface CommentFormProps {
  readonly onDismiss: () => void;
}

function CommentForm({onDismiss}: CommentFormProps) {
  const session = use(SessionContext);

  if (!isDefined(session)) {
    return <SignInPrompt onDismiss={onDismiss} />;
  }

  return <DiffEditor onDismiss={onDismiss} />;
}

interface SignInPromptProps {
  readonly onDismiss: () => void;
}

function SignInPrompt({onDismiss}: SignInPromptProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const name = use(AnnotationNameContext);

  return (
    <Card variant="secondary" className="m-2 mbs-1">
      <Card.Header>
        <Card.Title>Sign in to comment</Card.Title>
        <Card.Description>
          Connect your GitHub account to leave comments on this diff.
        </Card.Description>
      </Card.Header>
      <Card.Footer className="flex flex-wrap-reverse items-center justify-end gap-2">
        <Button
          id={`${name}-sign-in-cancel`}
          variant="ghost"
          size="sm"
          onPress={onDismiss}
        >
          Cancel
        </Button>
        <Button
          id={`${name}-sign-in-github`}
          size="sm"
          isPending={isSigningIn}
          onPress={async () => {
            setIsSigningIn(true);
            try {
              await authClient.signIn.social({
                provider: 'github',
                callbackURL: window.location.href,
                fetchOptions: {throw: true},
              });
            } catch {
              setIsSigningIn(false);
            }
          }}
        >
          {({isPending}) => (
            <>
              {isPending ? (
                <Spinner aria-hidden color="current" size="sm" />
              ) : (
                <GitHubIcon aria-hidden className="size-4" />
              )}
              Continue with GitHub
            </>
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
}

function ThreadAnnotation() {
  return <div>Thread Annotation</div>;
}
