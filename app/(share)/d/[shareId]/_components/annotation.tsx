'use client';

import {createContext, Fragment, use, useState} from 'react';
import dynamic from 'next/dynamic';
import {Button, Card, Separator, Spinner} from '@heroui/react';
import {getLineAnnotationName} from '@pierre/diffs';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';
import {authClient} from '@/auth/client';
import {SessionContext} from '@/auth/context';
import {GitHubIcon} from '@/auth/icon';
import {
  type DiffAnnotation,
  isFormAnnotation,
  isThreadAnnotation,
} from '@/diffs/annotations';
import {createComment, openThread} from '@/events/actions';
import {FoldedShareStateContext, ShareStateContext} from '@/events/provider';
import type {Actor, Anchor} from '@/events/schemas';
import {useShareId} from '../_hooks/use-share-id';
import {CommentList} from './comment-list';
import {EditorSkeleton} from './editor-skeleton';
import {FileStatesContext} from './provider';
import {ReplyInputSkeleton} from './reply-input-skeleton';

interface File {
  readonly id: string;
  readonly path: string;
}

const Editor = dynamic(
  () => import('./editor').then((module) => module.Editor),
  {loading: () => <EditorSkeleton />},
);

const ReplyInput = dynamic(
  () => import('./reply-input').then((module) => module.ReplyInput),
  {loading: () => <ReplyInputSkeleton />},
);

const FileContext = createContext<File>(null as never);

const AnnotationContext = createContext<DiffAnnotation>(null as never);

interface DiffAnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly fileId: string;
  readonly filePath: string;
  readonly onDismiss: () => void;
}

export function DiffAnnotation({
  annotation,
  fileId,
  filePath,
  onDismiss,
}: DiffAnnotationProps) {
  return (
    <FileContext
      value={{
        id: fileId,
        path: filePath,
      }}
    >
      <AnnotationContext value={annotation}>
        <AnnotationBody onDismiss={onDismiss} />
      </AnnotationContext>
    </FileContext>
  );
}

interface AnnotationBodyProps {
  readonly onDismiss?: () => void;
}

function AnnotationBody({onDismiss}: AnnotationBodyProps) {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      setIsFocusWithin(isFocusWithin);
    },
  });

  const {metadata} = use(AnnotationContext);

  useKeyDown((event) => {
    if (event.key === 'Escape' && metadata.type === 'form' && isFocusWithin) {
      onDismiss?.();
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
  readonly onDismiss?: () => void;
}

function CommentForm({onDismiss}: CommentFormProps) {
  const shareId = useShareId();

  const session = use(SessionContext);
  if (!isDefined(session)) {
    return <SignInPrompt onDismiss={onDismiss} />;
  }

  const annotation = use(AnnotationContext);
  if (!isFormAnnotation(annotation)) {
    throw new TypeError('Annotation is not a form');
  }

  const state = use(ShareStateContext);
  const file = use(FileContext);
  const fileStates = use(FileStatesContext);

  return (
    <Editor
      placeholder="Leave a comment…"
      initialState={annotation.metadata.draft}
      onComment={async (body) => {
        const threadId = newId();
        const commentId = newId();

        const actorId = session.user.id;
        const actor: Actor = {
          name: session.user.name,
          image: session.user.image ?? null,
        };

        const createdAt = new Date().toISOString();

        const anchor: Anchor = {
          shareId,
          filePath: file.path,
          side: annotation.side,
          line: annotation.lineNumber,
        };

        const pendingIds = state.optimisticAll([
          {
            actorId,
            actor,
            createdAt,
            payload: {
              $type: 'thread.opened',
              threadId,
              anchor,
            },
          },
          {
            actorId,
            actor,
            createdAt,
            payload: {
              $type: 'comment.created',
              threadId,
              commentId,
              body,
            },
          },
        ]);

        try {
          await openThread({
            shareId,
            threadId,
            commentId,
            body,
            anchor,
          });
        } catch {
          state.rejectAll(pendingIds);
        }
      }}
      onChange={(state) => {
        fileStates.updateCommentFormDraft(
          file.id,
          annotation.metadata.formId,
          state,
        );
      }}
      onDismiss={onDismiss}
      className="m-2 mbs-1"
    />
  );
}

interface SignInPromptProps {
  readonly onDismiss?: () => void;
}

function SignInPrompt({onDismiss}: SignInPromptProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const annotation = use(AnnotationContext);
  if (!isFormAnnotation(annotation)) {
    throw new TypeError('Annotation is not a form');
  }

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
          onPress={() => onDismiss?.()}
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
  const annotation = use(AnnotationContext);
  if (!isThreadAnnotation(annotation)) {
    throw new TypeError('Annotation is not a thread');
  }

  const shareId = useShareId();
  const folded = use(FoldedShareStateContext);

  const thread = folded.threads.get(annotation.metadata.threadId);
  if (!isDefined(thread)) {
    throw new Error(`Thread not found: ${annotation.metadata.threadId}`);
  }

  const session = use(SessionContext);
  const state = use(ShareStateContext);

  const comments = thread.commentIds
    .map((commentId) => folded.comments.get(commentId))
    .filter((comment) => isDefined(comment));

  return (
    <Card variant="secondary" className="m-2 mbs-1 gap-0 p-0">
      <CommentList comments={comments} />

      {isDefined(session) && (
        <>
          <div className="mx-3">
            <Separator />
          </div>
          <div className="p-3">
            <ReplyInput
              onComment={async (body) => {
                const actorId = session.user.id;
                const actor: Actor = {
                  name: session.user.name,
                  image: session.user.image ?? null,
                };

                const commentId = newId();
                const createdAt = new Date().toISOString();

                const threadId = annotation.metadata.threadId;

                const pendingId = state.optimistic({
                  actorId,
                  actor,
                  createdAt,
                  payload: {
                    $type: 'comment.created',
                    threadId,
                    commentId,
                    body,
                  },
                });

                try {
                  await createComment({
                    shareId,
                    threadId,
                    commentId,
                    body,
                  });
                } catch {
                  state.reject(pendingId);
                }
              }}
            />
          </div>
        </>
      )}
    </Card>
  );
}
