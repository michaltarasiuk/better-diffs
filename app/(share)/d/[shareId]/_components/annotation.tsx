'use client';

import {Card} from '@heroui/react';
import type {SerializedEditorState} from 'lexical';
import {use} from 'react';

import type {Session} from '@/auth/server';
import {SignedIn} from '@/auth/signed-in';
import type {DiffAnnotation, FormAnnotationMetadata} from '@/diffs/annotations';
import {createComment, openThread} from '@/events/actions';
import {toEventActor} from '@/events/actor';
import {ShareActionsContext, ShareStateContext} from '@/events/provider';
import type {Anchor} from '@/events/schemas';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

import {useDismissOnEscape} from '../_hooks/use-dismiss-on-escape';
import {useShareId} from '../_hooks/use-share-id';
import {CommentList} from './comment-list';
import {InsetSeparator} from './inset-separator';
import {LazyCommentEditor as CommentEditor} from './lazy-comment-editor';
import {ReplyInput} from './reply-input';
import {DraftsContext, ReviewStateContext} from './review-state-provider';
import {SignIn} from './sign-in';

type AnnotationLine = Omit<DiffAnnotation, 'metadata'>;

interface AnnotationProps {
  readonly annotation: DiffAnnotation;
  readonly fileId: string;
  readonly filePath: string;
}

export function Annotation({annotation, fileId, filePath}: AnnotationProps) {
  const {removeCommentForm} = use(ReviewStateContext);

  const {metadata, ...line} = annotation;

  const onDismiss =
    metadata.type === 'form'
      ? () => removeCommentForm(fileId, metadata.formId)
      : undefined;

  const focusWithinProps = useDismissOnEscape(onDismiss);

  let body: React.ReactNode;
  switch (metadata.type) {
    case 'form':
      body = (
        <CommentForm
          line={line}
          form={metadata}
          filePath={filePath}
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
  readonly filePath: string;
  readonly onDismiss?: () => void;
}

function CommentForm({line, form, filePath, onDismiss}: CommentFormProps) {
  const shareId = useShareId();
  const {optimistic} = use(ShareActionsContext);
  const {getDraft, setDraft} = use(DraftsContext);

  function submit(session: Session, body: SerializedEditorState) {
    const threadId = newId();
    const commentId = newId();
    const anchor: Anchor = {
      shareId,
      filePath,
      side: line.side,
      line: line.lineNumber,
    };
    const meta = {
      ...toEventActor(session),
      createdAt: new Date().toISOString(),
    };

    return optimistic(
      [
        {
          ...meta,
          payload: {$type: 'thread.opened', threadId, anchor},
        },
        {
          ...meta,
          payload: {$type: 'comment.created', threadId, commentId, body},
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
  const share = use(ShareStateContext);

  const thread = share.threads.get(threadId);
  if (!isDefined(thread)) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  const shareId = useShareId();
  const {optimistic} = use(ShareActionsContext);
  const {getDraft, setDraft, clearDraft} = use(DraftsContext);

  async function reply(session: Session, body: SerializedEditorState) {
    const commentId = newId();
    const createdAt = new Date().toISOString();

    const replied = await optimistic(
      [
        {
          ...toEventActor(session),
          createdAt,
          payload: {$type: 'comment.created', threadId, commentId, body},
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
    if (replied) {
      clearDraft(threadId);
    }
  }

  const comments = thread.commentIds
    .map((commentId) => share.comments.get(commentId))
    .filter((comment) => isDefined(comment));

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
                onSubmit={(body) => reply(session, body)}
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
