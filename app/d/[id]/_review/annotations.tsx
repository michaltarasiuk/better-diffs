'use client';

import {Button, Card, Spinner} from '@heroui/react';
import {getLineAnnotationName} from '@pierre/diffs';
import {PlusIcon} from 'lucide-react';
import dynamic from 'next/dynamic';
import {createContext, use, useState} from 'react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {GitHubIcon} from '@/lib/auth/github-icon';
import {useKeyDown} from '@/lib/hooks/use-key-down';
import {assert} from '@/lib/utils/assert';
import {isDefined} from '@/lib/utils/defined';

import {CommentEditorSkeleton} from './comment-editor-skeleton';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {DiffLineAnnotation} from '@pierre/diffs';

function preloadCommentEditor() {
  void import('./comment-editor');
}

const CommentEditor = dynamic(
  () => import('./comment-editor').then((module) => module.CommentEditor),
  {loading: () => <CommentEditorSkeleton />},
);

export type DiffAnnotation = DiffLineAnnotation<AnnotationMetadata>;

type FormDiffAnnotation = DiffLineAnnotation<{readonly type: 'form'}>;

function isFormAnnotation(
  annotation: DiffAnnotation,
): annotation is FormDiffAnnotation {
  return annotation.metadata.type === 'form';
}

const AnnotationContext = createContext<DiffAnnotation>(null as never);

interface GutterUtilityProps {
  readonly onAddAnnotation: () => void;
}

export function GutterUtility({onAddAnnotation}: GutterUtilityProps) {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      onHoverStart={preloadCommentEditor}
      onFocus={preloadCommentEditor}
      onPress={onAddAnnotation}
      isIconOnly
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
    >
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}

interface AnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly onDismiss: () => void;
}

export function Annotation({annotation, onDismiss}: AnnotationProps) {
  return (
    <AnnotationContext value={annotation}>
      <AnnotationBody onDismiss={onDismiss} />
    </AnnotationContext>
  );
}

interface AnnotationBodyProps {
  readonly onDismiss: () => void;
}

function AnnotationBody({onDismiss}: AnnotationBodyProps) {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange: (isFocusWithin) => setIsFocusWithin(isFocusWithin),
  });

  const {metadata} = use(AnnotationContext);

  useKeyDown((event) => {
    if (event.key === 'Escape' && metadata.type === 'form' && isFocusWithin) {
      onDismiss();
    }
  });

  let annotation: React.ReactNode;
  switch (metadata.type) {
    case 'form':
      annotation = <CommentForm onDismiss={onDismiss} />;
      break;
    case 'thread':
      annotation = <ThreadAnnotation />;
      break;
    default:
      metadata satisfies never;
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

  return <CommentEditor onComment={() => {}} onDismiss={onDismiss} />;
}

interface SignInPromptProps {
  readonly onDismiss: () => void;
}

function SignInPrompt({onDismiss}: SignInPromptProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const annotation = use(AnnotationContext);
  assert(isFormAnnotation(annotation), 'Annotation must be a form');

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
          id={`${getLineAnnotationName(annotation)}-sign-in-cancel`}
          variant="ghost"
          size="sm"
          onPress={onDismiss}
        >
          Cancel
        </Button>
        <Button
          id={`${getLineAnnotationName(annotation)}-sign-in-github`}
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
              {isPending ? 'Signing in…' : 'Continue with GitHub'}
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
