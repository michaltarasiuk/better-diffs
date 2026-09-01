'use client';

import {Button, Card, Spinner} from '@heroui/react';
import {getLineAnnotationName} from '@pierre/diffs';
import {PlusIcon} from 'lucide-react';
import dynamic from 'next/dynamic';
import {useParams} from 'next/navigation';
import {createContext, use, useState} from 'react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {useKeyDown} from '@/lib/hooks/use-key-down';
import {GitHubIcon} from '@/lib/icons/github-icon';
import {isDefined} from '@/lib/utils/defined';

import {addComment} from './_actions';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {DiffLineAnnotation} from '@pierre/diffs';

function preloadDiffEditor() {
  void import('./_diff-editor');
}

const DiffEditor = dynamic(
  () => import('./_diff-editor').then((m) => m.DiffEditor),
  {loading: () => null},
);

export type DiffAnnotation = DiffLineAnnotation<AnnotationMetadata>;

const AnnotationContext = createContext<DiffAnnotation>(null as never);

interface GutterUtilityProps {
  readonly onAddAnnotation: () => void;
}

export function GutterUtility({onAddAnnotation}: GutterUtilityProps) {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      isIconOnly
      onHoverStart={preloadDiffEditor}
      onFocus={preloadDiffEditor}
      onPress={onAddAnnotation}
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
    >
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}

interface AnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly fileId: string;
  readonly onDismiss: () => void;
}

export function Annotation({annotation, fileId, onDismiss}: AnnotationProps) {
  return (
    <AnnotationContext value={annotation}>
      <AnnotationBody fileId={fileId} onDismiss={onDismiss} />
    </AnnotationContext>
  );
}

interface AnnotationBodyProps {
  readonly fileId: string;
  readonly onDismiss: () => void;
}

function AnnotationBody({fileId, onDismiss}: AnnotationBodyProps) {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange: (isFocusWithin) => setIsFocusWithin(isFocusWithin),
  });

  const {metadata} = use(AnnotationContext);

  useKeyDown((e) => {
    if (e.key === 'Escape' && metadata.type === 'form' && isFocusWithin) {
      onDismiss();
    }
  });

  let annotation: React.ReactNode;
  switch (metadata.type) {
    case 'form':
      annotation = <CommentForm fileId={fileId} onDismiss={onDismiss} />;
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
  readonly fileId: string;
  readonly onDismiss: () => void;
}

function CommentForm({fileId, onDismiss}: CommentFormProps) {
  const {id: shareId} = useParams<{id: string}>();

  const session = use(SessionContext);
  const {side, lineNumber} = use(AnnotationContext);

  if (!isDefined(session)) {
    return <SignInPrompt onDismiss={onDismiss} />;
  }

  return (
    <DiffEditor
      onComment={(body) =>
        addComment({
          shareId,
          fileId,
          side,
          lineNumber,
          body,
        })
      }
      onDismiss={onDismiss}
    />
  );
}

interface SignInPromptProps {
  readonly onDismiss: () => void;
}

function SignInPrompt({onDismiss}: SignInPromptProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const annotation = use(AnnotationContext);

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
