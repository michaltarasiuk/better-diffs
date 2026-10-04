'use client';

import {createContext, use, useState} from 'react';
import dynamic from 'next/dynamic';
import {Button, Card, Separator, Spinner} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {getLineAnnotationName} from '@pierre/diffs';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';
import {authClient} from '@/auth/client';
import {SessionContext} from '@/auth/context';
import {GitHubIcon} from '@/auth/github-icon';
import {
  type DiffAnnotation,
  isFormAnnotation,
  isThreadAnnotation,
} from '@/diffs/annotations';
import {createComment, openThread} from '@/events/actions';
import {FoldedStateContext, ShareStateContext} from '@/events/provider';
import type {Actor, Anchor} from '@/events/schemas';
import {useShareId} from '../_hooks/use-share-id';
import {CommentList} from './comment-list';
import {EditorSkeleton} from './editor-skeleton';
import {ReviewStateContext} from './provider';
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

interface AnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly fileId: string;
  readonly filePath: string;
}

export function Annotation({annotation, fileId, filePath}: AnnotationProps) {
  return (
    <FileContext
      value={{
        id: fileId,
        path: filePath,
      }}
    >
      <AnnotationContext value={annotation}>
        <AnnotationBody />
      </AnnotationContext>
    </FileContext>
  );
}

function AnnotationBody() {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      setIsFocusWithin(isFocusWithin);
    },
  });

  const annotation = use(AnnotationContext);
  const file = use(FileContext);
  const {removeCommentForm} = use(ReviewStateContext);

  const onDismiss = isFormAnnotation(annotation)
    ? () => removeCommentForm(file.id, annotation.metadata.formId)
    : undefined;

  useKeyDown((event) => {
    if (event.key === 'Escape' && isFocusWithin) {
      onDismiss?.();
    }
  });

  let body: React.ReactNode;
  switch (annotation.metadata.type) {
    case 'form':
      body = <CommentForm onDismiss={onDismiss} />;
      break;
    case 'thread':
      body = <ThreadAnnotation />;
      break;
    default:
      annotation.metadata satisfies never;
  }

  return (
    <div
      {...focusWithinProps}
      className="w-(--diffs-single-annotation-width,100%) font-sans"
    >
      {body}
    </div>
  );
}

interface CommentFormProps {
  readonly onDismiss?: () => void;
}

function CommentForm({onDismiss}: CommentFormProps) {
  const shareId = useShareId();

  const session = use(SessionContext);
  if (!isDefined(session)) {
    return (
      <div className="m-2 mbs-1">
        <SignInCard onDismiss={onDismiss} />
      </div>
    );
  }

  const annotation = use(AnnotationContext);
  if (!isFormAnnotation(annotation)) {
    throw new TypeError('Annotation is not a form');
  }

  const state = use(ShareStateContext);
  const file = use(FileContext);
  const reviewState = use(ReviewStateContext);

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
        reviewState.setCommentFormDraft(
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

interface SignInCardProps {
  readonly variant?: 'primary' | 'secondary';
  readonly onDismiss?: () => void;
}

function SignInCard({variant = 'primary', onDismiss}: SignInCardProps) {
  const prompt = (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
      <p
        className={typographyVariants({type: 'body-sm'}).base({
          className: 'text-muted',
        })}
      >
        Sign in to {variant === 'primary' ? 'comment' : 'reply'}
      </p>
      <div className="flex items-center gap-2">
        <SignInActions onDismiss={onDismiss} />
      </div>
    </div>
  );

  return variant === 'primary' ? (
    <Card variant="secondary" className="p-0">
      {prompt}
    </Card>
  ) : (
    prompt
  );
}

function SignInActions({onDismiss}: {readonly onDismiss?: () => void}) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const annotation = use(AnnotationContext);

  const annotationName = getLineAnnotationName({
    side: annotation.side,
    lineNumber: annotation.lineNumber,
  });

  return (
    <>
      <Button
        id={`${annotationName}-sign-in-cancel`}
        variant="ghost"
        size="sm"
        onPress={() => onDismiss?.()}
      >
        Cancel
      </Button>

      <Button
        id={`${annotationName}-sign-in-github`}
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
    </>
  );
}

function ThreadAnnotation() {
  const annotation = use(AnnotationContext);
  if (!isThreadAnnotation(annotation)) {
    throw new TypeError('Annotation is not a thread');
  }

  const shareId = useShareId();
  const folded = use(FoldedStateContext);

  const thread = folded.threads.get(annotation.metadata.threadId);
  if (!isDefined(thread)) {
    throw new Error(`Thread not found: ${annotation.metadata.threadId}`);
  }

  const state = use(ShareStateContext);

  const comments = thread.commentIds
    .map((commentId) => folded.comments.get(commentId))
    .filter((comment) => isDefined(comment));

  return (
    <Card variant="secondary" className="m-2 mbs-1 gap-0 p-0">
      <CommentList comments={comments} />

      <div className="mx-3">
        <Separator />
      </div>

      <ReplyInput
        signIn={({onDismiss}) => (
          <SignInCard variant="secondary" onDismiss={onDismiss} />
        )}
        onReply={async (body, session) => {
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
    </Card>
  );
}
