'use client';

import {use, useEffect, useRef, useState} from 'react';
import dynamic from 'next/dynamic';

import {Button, Card, Separator, Spinner} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {getLineAnnotationName} from '@pierre/diffs';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {authClient} from '@/auth/client';
import {SessionContext} from '@/auth/context';
import {GitHubIcon} from '@/auth/github-icon';
import type {DiffAnnotation, FormAnnotationMetadata} from '@/diffs/annotations';
import {createComment, openThread} from '@/events/actions';
import {FoldedStateContext, ShareStateContext} from '@/events/provider';
import type {Actor, Anchor} from '@/events/schemas';
import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {useShareId} from '../_hooks/use-share-id';
import {CommentList} from './comment-list';
import {EditorSkeleton} from './editor-skeleton';
import {ReviewStateContext} from './provider';
import {ReplyInputSkeleton} from './reply-input-skeleton';

type AnnotationLine = Omit<DiffAnnotation, 'metadata'>;

const Editor = dynamic(
  () => import('./editor').then((module) => module.Editor),
  {loading: () => <EditorSkeleton />},
);

const ReplyInput = dynamic(
  () => import('./reply-input').then((module) => module.ReplyInput),
  {loading: () => <ReplyInputSkeleton />},
);

interface AnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly fileId: string;
  readonly filePath: string;
}

export function Annotation({annotation, fileId, filePath}: AnnotationProps) {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      setIsFocusWithin(isFocusWithin);
    },
  });

  const {removeCommentForm} = use(ReviewStateContext);

  const {metadata, ...line} = annotation;

  const onDismiss =
    metadata.type === 'form'
      ? () => removeCommentForm(fileId, metadata.formId)
      : undefined;

  useKeyDown((event) => {
    if (event.key === 'Escape' && isFocusWithin) {
      onDismiss?.();
    }
  });

  let body: React.ReactNode;
  switch (metadata.type) {
    case 'form':
      body = (
        <CommentForm
          line={line}
          form={metadata}
          fileId={fileId}
          filePath={filePath}
          onDismiss={onDismiss}
        />
      );
      break;
    case 'thread':
      body = (
        <ThreadAnnotation
          line={line}
          threadId={metadata.threadId}
          fileId={fileId}
        />
      );
      break;
    default:
      metadata satisfies never;
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
  readonly line: AnnotationLine;
  readonly form: FormAnnotationMetadata;
  readonly fileId: string;
  readonly filePath: string;
  readonly onDismiss?: () => void;
}

function CommentForm({
  line,
  form,
  fileId,
  filePath,
  onDismiss,
}: CommentFormProps) {
  const shareId = useShareId();

  const session = use(SessionContext);
  if (!isDefined(session)) {
    return (
      <Card variant="secondary" className="m-2 mbs-1 p-0">
        <SignInPrompt action="comment" line={line} onDismiss={onDismiss} />
      </Card>
    );
  }

  const state = use(ShareStateContext);
  const {setCommentFormDraft} = use(ReviewStateContext);

  return (
    <Editor
      placeholder="Leave a comment…"
      initialState={form.draft}
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
          filePath,
          side: line.side,
          line: line.lineNumber,
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
        setCommentFormDraft(fileId, form.formId, state);
      }}
      onDismiss={onDismiss}
      className="m-2 mbs-1"
    />
  );
}

interface SignInPromptProps {
  readonly action: 'comment' | 'reply';
  readonly line: AnnotationLine;
  readonly onDismiss?: () => void;
}

function SignInPrompt({action, line, onDismiss}: SignInPromptProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
      <p
        className={typographyVariants({type: 'body-sm'}).base({
          className: 'text-muted',
        })}
      >
        Sign in to {action}
      </p>
      <div className="flex items-center gap-2">
        <SignInActions line={line} onDismiss={onDismiss} />
      </div>
    </div>
  );
}

interface SignInActionsProps {
  readonly line: AnnotationLine;
  readonly onDismiss?: () => void;
}

function SignInActions({line, onDismiss}: SignInActionsProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const signInRef = useRef<AbortController>(null);

  useEffect(() => {
    return () => signInRef.current?.abort();
  }, []);

  const annotationName = getLineAnnotationName(line);

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
          const controller = new AbortController();
          signInRef.current = controller;
          setIsSigningIn(true);
          try {
            const {url} = await authClient.signIn.social({
              provider: 'github',
              callbackURL: window.location.href,
              disableRedirect: true,
              fetchOptions: {throw: true, signal: controller.signal},
            });
            controller.signal.throwIfAborted();
            if (!isDefined(url)) {
              throw new Error('Sign-in response has no redirect URL');
            }
            // The page stays interactive until GitHub responds, so a dismiss
            // after this point has to cancel the pending navigation.
            controller.signal.addEventListener('abort', () => window.stop());
            window.location.assign(url);
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

interface ThreadAnnotationProps {
  readonly line: AnnotationLine;
  readonly threadId: string;
  readonly fileId: string;
}

function ThreadAnnotation({line, threadId, fileId}: ThreadAnnotationProps) {
  const shareId = useShareId();
  const folded = use(FoldedStateContext);

  const thread = folded.threads.get(threadId);
  if (!isDefined(thread)) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  const state = use(ShareStateContext);
  const {getFileState, setReplyDraft, clearReplyDraft} =
    use(ReviewStateContext);

  const replyDraft = getFileState(fileId).replyDrafts[threadId];
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
        initialState={replyDraft}
        signIn={({onDismiss}) => (
          <SignInPrompt action="reply" line={line} onDismiss={onDismiss} />
        )}
        onReply={async (body, session) => {
          const actorId = session.user.id;
          const actor: Actor = {
            name: session.user.name,
            image: session.user.image ?? null,
          };

          const commentId = newId();
          const createdAt = new Date().toISOString();

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
            clearReplyDraft(fileId, threadId);
          } catch {
            state.reject(pendingId);
          }
        }}
        onChange={(draft) => {
          setReplyDraft(fileId, threadId, draft);
        }}
      />
    </Card>
  );
}
