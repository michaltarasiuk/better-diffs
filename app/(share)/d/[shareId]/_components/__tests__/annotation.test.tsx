// @vitest-environment jsdom

import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {SerializedEditorState} from 'lexical';
import {use} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {SessionContext} from '@/auth/context';
import type {Session} from '@/auth/server';
import type {DiffAnnotation} from '@/diffs/annotations';
import {FoldedStateContext, ShareStateContext} from '@/events/provider';
import {ShareState} from '@/events/state';
import {newId} from '@/utils/new-id';

import {Annotation} from '../annotation';
import {ReviewStateContext} from '../provider';

const {openThread, createComment} = vi.hoisted(() => ({
  openThread: vi.fn<typeof import('@/events/actions').openThread>(),
  createComment: vi.fn<typeof import('@/events/actions').createComment>(),
}));

vi.mock('@/events/actions', () => ({openThread, createComment}));

vi.mock('@/auth/client', () => ({authClient: {}}));

vi.mock('next/navigation', () => ({
  useParams: () => ({shareId: SHARE_ID}),
}));

// Loads eagerly and marks the promise settled, so React renders the component
// synchronously instead of suspending on it.
vi.mock('next/dynamic', () => ({
  default: <P extends object>(load: () => Promise<React.ComponentType<P>>) => {
    const promise = load().then((Component) => {
      void Object.assign(promise, {status: 'fulfilled', value: Component});
      return Component;
    });
    return function Dynamic(props: P) {
      const Component = use(promise);
      return <Component {...props} />;
    };
  },
}));

vi.mock('../editor', () => ({
  Editor: ({
    placeholder,
    onComment,
  }: {
    placeholder: string;
    onComment: (body: SerializedEditorState) => Promise<void>;
  }) => <button onClick={() => onComment(BODY)}>{placeholder}</button>,
}));

vi.mock('../reply-input', () => ({
  ReplyInput: ({
    signIn,
    onReply,
  }: {
    signIn: (props: {onDismiss: () => void}) => React.ReactNode;
    onReply: (body: SerializedEditorState, session: Session) => Promise<void>;
  }) => (
    <>
      <button onClick={() => onReply(BODY, SESSION)}>Reply</button>
      {signIn({onDismiss: () => {}})}
    </>
  ),
}));

const SHARE_ID = newId();
const FILE_ID = 'file-1';
const FILE_PATH = 'src/index.ts';
const BODY = {root: {}} as SerializedEditorState;
const SESSION = {
  user: {id: 'alice', name: 'Alice', image: null},
} as unknown as Session;

const reviewState = {
  removeCommentForm: vi.fn(),
  setCommentFormDraft: vi.fn(),
  getFileState: vi.fn(() => ({replyDrafts: {}})),
  setReplyDraft: vi.fn(),
  clearReplyDraft: vi.fn(),
};

let state: ShareState;

function formAnnotation(): DiffAnnotation {
  return {
    side: 'additions',
    lineNumber: 7,
    metadata: {type: 'form', formId: 'form-1'},
  };
}

function threadAnnotation(threadId: string): DiffAnnotation {
  return {
    side: 'additions',
    lineNumber: 7,
    metadata: {type: 'thread', threadId},
  };
}

function openOptimisticThread() {
  const threadId = newId();
  state.optimisticAll([
    {
      actorId: 'alice',
      actor: {name: 'Alice', image: null},
      createdAt: new Date().toISOString(),
      payload: {
        $type: 'thread.opened',
        threadId,
        anchor: {
          shareId: SHARE_ID,
          filePath: FILE_PATH,
          side: 'additions',
          line: 7,
        },
      },
    },
  ]);
  return threadId;
}

function renderAnnotation(
  annotation: DiffAnnotation,
  session: Session | null = SESSION,
) {
  render(
    <SessionContext value={session}>
      <ShareStateContext value={state}>
        <FoldedStateContext value={state.getSnapshot()}>
          <ReviewStateContext value={reviewState as never}>
            <Annotation
              annotation={annotation}
              fileId={FILE_ID}
              filePath={FILE_PATH}
            />
          </ReviewStateContext>
        </FoldedStateContext>
      </ShareStateContext>
    </SessionContext>,
  );
}

beforeEach(() => {
  state = new ShareState();
  reviewState.getFileState.mockReturnValue({replyDrafts: {}});
});

describe('Annotation', () => {
  describe('comment form', () => {
    it('opens a thread at the annotated line', async () => {
      openThread.mockResolvedValue([]);
      renderAnnotation(formAnnotation());

      await userEvent.click(
        screen.getByRole('button', {name: 'Leave a comment…'}),
      );

      expect(openThread).toHaveBeenCalledExactlyOnceWith({
        shareId: SHARE_ID,
        threadId: expect.any(String),
        commentId: expect.any(String),
        body: BODY,
        anchor: {
          shareId: SHARE_ID,
          filePath: FILE_PATH,
          side: 'additions',
          line: 7,
        },
      });
    });

    it('shows the thread before the server confirms it', async () => {
      let confirm!: () => void;
      openThread.mockReturnValue(
        new Promise((resolve) => {
          confirm = () => resolve([]);
        }),
      );
      renderAnnotation(formAnnotation());

      await userEvent.click(
        screen.getByRole('button', {name: 'Leave a comment…'}),
      );

      const {threads, comments, pendingIds} = state.getSnapshot();
      expect(threads.size).toBe(1);
      expect(comments.size).toBe(1);
      expect(pendingIds.size).toBe(2);
      await act(async () => confirm());
    });

    it('rolls back the thread when the server rejects it', async () => {
      openThread.mockRejectedValue(new Error('Offline'));
      renderAnnotation(formAnnotation());

      await userEvent.click(
        screen.getByRole('button', {name: 'Leave a comment…'}),
      );

      expect(openThread).toHaveBeenCalledOnce();
      expect(state.getSnapshot().threads.size).toBe(0);
    });

    it('asks signed-out users to sign in', async () => {
      renderAnnotation(formAnnotation(), null);

      expect(screen.getByText('Sign in to comment')).toBeInTheDocument();
      expect(
        screen.getByRole('button', {name: 'Continue with GitHub'}),
      ).toBeInTheDocument();
    });

    it('removes the form when sign-in is cancelled', async () => {
      renderAnnotation(formAnnotation(), null);

      await userEvent.click(screen.getByRole('button', {name: 'Cancel'}));

      expect(reviewState.removeCommentForm).toHaveBeenCalledExactlyOnceWith(
        FILE_ID,
        'form-1',
      );
    });
  });

  describe('thread', () => {
    it('replies and clears the draft', async () => {
      createComment.mockResolvedValue([]);
      const threadId = openOptimisticThread();
      renderAnnotation(threadAnnotation(threadId));

      await userEvent.click(screen.getByRole('button', {name: 'Reply'}));

      expect(createComment).toHaveBeenCalledExactlyOnceWith({
        shareId: SHARE_ID,
        threadId,
        commentId: expect.any(String),
        body: BODY,
      });
      expect(reviewState.clearReplyDraft).toHaveBeenCalledExactlyOnceWith(
        FILE_ID,
        threadId,
      );
      expect(
        state.getSnapshot().threads.get(threadId)?.commentIds,
      ).toHaveLength(1);
    });

    it('rolls back the reply and keeps the draft when rejected', async () => {
      createComment.mockRejectedValue(new Error('Offline'));
      const threadId = openOptimisticThread();
      renderAnnotation(threadAnnotation(threadId));

      await userEvent.click(screen.getByRole('button', {name: 'Reply'}));

      expect(createComment).toHaveBeenCalledOnce();
      expect(state.getSnapshot().threads.get(threadId)?.commentIds).toEqual([]);
      expect(reviewState.clearReplyDraft).not.toHaveBeenCalled();
    });

    it('offers sign-in for replies', async () => {
      const threadId = openOptimisticThread();
      renderAnnotation(threadAnnotation(threadId));

      expect(screen.getByText('Sign in to reply')).toBeInTheDocument();
    });
  });
});
