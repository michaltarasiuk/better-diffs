'use client';

import {Card, toast} from '@heroui/react';
import type {SerializedEditorState} from 'lexical';

import type {Session} from '#/auth/server';
import {SignedIn} from '#/auth/signed-in';
import type {DiffAnnotation, FormAnnotationMetadata} from '#/diffs/annotations';
import {createComment, openThread} from '#/threads/actions';
import {toActor} from '#/threads/actor';
import type {ThreadError} from '#/threads/errors';
import {useShareActions, useShareState} from '#/threads/provider';
import type {Anchor} from '#/threads/schemas';
import {isDefined} from '#/utils/is-defined';
import {newId} from '#/utils/new-id';

import {useDismissOnEscape} from '../_hooks/use-dismiss-on-escape';
import {useShareId} from '../_hooks/use-share-id';
import {threadErrorMessage} from '../_lib/thread-error-message';
import {CommentList} from './comment-list';
import {InsetSeparator} from './inset-separator';
import {LazyCommentEditor as CommentEditor} from './lazy-comment-editor';
import {ReplyInput} from './reply-input';
import {useDrafts, useReviewState} from './review-state-provider';
import {SignIn} from './sign-in';

type AnnotationLine = Omit<DiffAnnotation, 'metadata'>;

interface AnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly fileId: string;
}

export function Annotation({annotation, fileId}: AnnotationProps) {
  const {removeCommentForm} = useReviewState();
  const {clearDraft} = useDrafts();

  const {metadata, ...line} = annotation;

  const onDismiss =
    metadata.type === 'form'
      ? () => {
          removeCommentForm(fileId, metadata.formId);
          clearDraft(metadata.formId);
        }
      : undefined;

  const focusWithinProps = useDismissOnEscape(onDismiss);

  let body: React.ReactNode;
  switch (metadata.type) {
    case 'form':
      body = (
        <CommentForm
          line={line}
          form={metadata}
          fileId={fileId}
          onDismiss={onDismiss}
        />
      );
      break;
    case 'thread':
      body = <CommentThread line={line} threadId={metadata.threadId} />;
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
  readonly onDismiss?: () => void;
}

function CommentForm({line, form, fileId, onDismiss}: CommentFormProps) {
  const shareId = useShareId();
  const {optimistic} = useShareActions();
  const {removeCommentForm, restoreCommentForm} = useReviewState();
  const {getDraft, setDraft, clearDraft} = useDrafts();

  async function submit(session: Session, body: SerializedEditorState) {
    const threadId = newId();
    const commentId = newId();
    const anchor: Anchor = {
      fileId,
      side: line.side,
      line: line.lineNumber,
    };
    const meta = {
      ...toActor(session),
      createdAt: new Date().toISOString(),
    };

    removeCommentForm(fileId, form.formId);
    clearDraft(form.formId);
    const error = await optimistic(
      [
        {
          ...meta,
          change: {type: 'openThread', threadId, anchor},
        },
        {
          ...meta,
          change: {type: 'createComment', threadId, commentId, body},
        },
      ],
      () =>
        openThread({
          shareId,
          threadId,
          commentId,
          body,
          anchor,
        }),
    );
    if (isDefined(error)) {
      restoreCommentForm(fileId, {...line, metadata: form});
      setDraft(form.formId, body);
      notifyNotSaved(error);
    }
  }

  return (
    <SignedIn
      fallback={
        <Card variant="secondary" className="m-2 mbs-1 p-0">
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="hidden text-sm text-muted sm:block">
              Sign in to leave a comment.
            </p>
            <SignIn line={line} onDismiss={onDismiss} />
          </div>
        </Card>
      }
    >
      {(session) => (
        <div className="m-2 mbs-1">
          <CommentEditor
            placeholder="Leave a comment…"
            initialState={getDraft(form.formId)}
            onSubmit={(body) => submit(session, body)}
            onChange={(state) => {
              setDraft(form.formId, state);
            }}
            onDismiss={onDismiss}
          />
        </div>
      )}
    </SignedIn>
  );
}

interface CommentThreadProps {
  readonly line: AnnotationLine;
  readonly threadId: string;
}

function CommentThread({line, threadId}: CommentThreadProps) {
  const share = useShareState();
  const shareId = useShareId();
  const {optimistic} = useShareActions();
  const {getDraft, setDraft, clearDraft} = useDrafts();

  async function reply(session: Session, body: SerializedEditorState) {
    const commentId = newId();
    const createdAt = new Date().toISOString();

    clearDraft(threadId);
    const error = await optimistic(
      [
        {
          ...toActor(session),
          createdAt,
          change: {type: 'createComment', threadId, commentId, body},
        },
      ],
      () =>
        createComment({
          shareId,
          threadId,
          commentId,
          body,
        }),
    );
    if (isDefined(error)) {
      setDraft(threadId, body);
      notifyNotSaved(error);
    }
  }

  if (!share.threads.has(threadId)) {
    return null;
  }

  const comments = [...share.comments.values()].filter(
    (comment) => comment.threadId === threadId,
  );

  return (
    <Card variant="secondary" className="m-2 mbs-1 gap-0 p-0">
      <CommentList comments={comments} />

      <InsetSeparator />

      <ReplyInput>
        {({onDismiss}) => (
          <SignedIn
            fallback={
              <div className="flex min-h-15 flex-col justify-center p-3">
                <SignIn line={line} onDismiss={onDismiss} />
              </div>
            }
          >
            {(session) => (
              <CommentEditor
                placeholder="Write a reply…"
                initialState={getDraft(threadId)}
                autoFocus
                variant="transparent"
                className="rounded-b-xl"
                onSubmit={(body) => {
                  onDismiss();
                  return reply(session, body);
                }}
                onChange={(draft) => {
                  setDraft(threadId, draft);
                }}
                onDismiss={onDismiss}
              />
            )}
          </SignedIn>
        )}
      </ReplyInput>
    </Card>
  );
}

function notifyNotSaved({reason}: ThreadError) {
  toast.danger('Comment not saved', {
    description: threadErrorMessage(reason),
  });
}
