'use client';

import {Card} from '@heroui/react';
import {use} from 'react';

import {SignedIn} from '@/auth/signed-in';
import type {DiffAnnotation, FormAnnotationMetadata} from '@/diffs/annotations';
import {FoldedStateContext} from '@/events/provider';
import {isDefined} from '@/utils/is-defined';

import {useDismissOnEscape} from '../_hooks/use-dismiss-on-escape';
import {useOpenThread} from '../_hooks/use-open-thread';
import {useReply} from '../_hooks/use-reply';
import {CommentList} from './comment-list';
import {InsetSeparator} from './inset-separator';
import {LazyCommentEditor as CommentEditor} from './lazy-comment-editor';
import {ReplyInput} from './reply-input';
import {ReviewStateContext} from './review-state-provider';
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
          fileId={fileId}
          filePath={filePath}
          onDismiss={onDismiss}
        />
      );
      break;
    case 'thread':
      body = (
        <CommentThread
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
  const {setCommentFormDraft} = use(ReviewStateContext);
  const openThread = useOpenThread();

  return (
    <SignedIn
      fallback={
        <Card variant="secondary" className="m-2 mbs-1 p-0">
          <SignIn line={line} onDismiss={onDismiss} />
        </Card>
      }
    >
      {(session) => (
        <div className="m-2 mbs-1">
          <CommentEditor
            placeholder="Leave a comment…"
            initialState={form.draft}
            onSubmit={(body) =>
              openThread(
                session,
                {filePath, side: line.side, line: line.lineNumber},
                body,
              )
            }
            onChange={(state) => {
              setCommentFormDraft(fileId, form.formId, state);
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
  readonly fileId: string;
}

function CommentThread({line, threadId, fileId}: CommentThreadProps) {
  const folded = use(FoldedStateContext);

  const thread = folded.threads.get(threadId);
  if (!isDefined(thread)) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  const {getFileState, setReplyDraft, clearReplyDraft} =
    use(ReviewStateContext);
  const reply = useReply();

  const replyDraft = getFileState(fileId).replyDrafts[threadId];
  const comments = thread.commentIds
    .map((commentId) => folded.comments.get(commentId))
    .filter((comment) => isDefined(comment));

  return (
    <Card variant="secondary" className="m-2 mbs-1 gap-0 p-0">
      <CommentList comments={comments} />

      <InsetSeparator />

      <ReplyInput>
        {({onDismiss}) => (
          <SignedIn fallback={<SignIn line={line} onDismiss={onDismiss} />}>
            {(session) => (
              <CommentEditor
                placeholder="Write a reply…"
                initialState={replyDraft}
                autoFocus
                variant="transparent"
                className="rounded-b-xl"
                onSubmit={async (body) => {
                  const replied = await reply(session, threadId, body);
                  if (replied) {
                    clearReplyDraft(fileId, threadId);
                  }
                }}
                onChange={(draft) => {
                  setReplyDraft(fileId, threadId, draft);
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
