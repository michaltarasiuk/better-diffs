import '@/lib/diffs/diffs.module.css';

import {Button, Card} from '@heroui/react';
import {
  getLineAnnotationName,
  type FileDiffMetadata,
  type GetHoveredLineResult,
} from '@pierre/diffs';
import {FileDiff} from '@pierre/diffs/react';
import {LogInIcon, PlusIcon} from 'lucide-react';
import dynamic from 'next/dynamic';
import {createContext, use, useState} from 'react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {authClient} from '@/lib/auth/client';
import {SessionContext} from '@/lib/auth/context';
import {DIFF_VIEWER_OPTIONS} from '@/lib/diffs/options';
import {useKeyDown} from '@/lib/hooks/use-key-down';
import {isDefined} from '@/lib/utils/is-defined';

import type {AnnotationMetadata, LineAnnotation} from '@/lib/diffs/annotation';

const Editor = dynamic(() => import('./_editor').then((m) => m.Editor));

const AnnotationIdContext = createContext<string>(null as never);

interface DiffItemProps {
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
  readonly lineAnnotations: LineAnnotation[];
  readonly onAddFormAnnotation: (l: GetHoveredLineResult<'diff'>) => void;
  readonly onRemoveFormAnnotation: (l: GetHoveredLineResult<'diff'>) => void;
}

export function DiffItem({
  fileDiff,
  prerenderedHTML,
  lineAnnotations,
  onAddFormAnnotation,
  onRemoveFormAnnotation,
}: DiffItemProps) {
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
      renderGutterUtility={(g) => {
        return (
          <GutterUtility
            onAddAnnotation={() => {
              const l = g();
              if (isDefined(l)) {
                onAddFormAnnotation(l);
              } else {
                console.error('No hovered line');
              }
            }}
          />
        );
      }}
      renderAnnotation={(a) => {
        return (
          <AnnotationIdContext value={getLineAnnotationName(a)}>
            <Annotation
              metadata={a.metadata}
              onDismissForm={() => {
                onRemoveFormAnnotation({
                  lineNumber: a.lineNumber,
                  side: a.side,
                });
              }}
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
    return (
      <Card variant="secondary" className="m-2 mbs-1">
        <SignInPrompt />
      </Card>
    );
  }

  return <Editor onDismiss={onDismiss} />;
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
