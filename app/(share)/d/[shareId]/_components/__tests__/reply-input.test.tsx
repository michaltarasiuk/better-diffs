// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {SerializedEditorState} from 'lexical';
import {describe, expect, it, vi} from 'vitest';

import {SessionContext} from '@/auth/context';
import type {Session} from '@/auth/server';

import {ReplyInput} from '../reply-input';

const {Editor} = vi.hoisted(() => ({
  Editor: vi.fn<typeof import('../editor').Editor>(),
}));

vi.mock('../editor', () => ({Editor}));

const SESSION = {
  user: {id: 'alice', name: 'Alice', image: null},
} as unknown as Session;
const BODY = {root: {}} as SerializedEditorState;

function renderReplyInput({
  session = SESSION,
  onReply = vi.fn(),
}: {
  session?: Session | null;
  onReply?: React.ComponentProps<typeof ReplyInput>['onReply'];
} = {}) {
  Editor.mockImplementation(({onComment, onDismiss}) => (
    <div role="dialog" aria-label="Editor">
      <button onClick={() => onComment?.(BODY)}>Comment</button>
      <button onClick={() => onDismiss?.()}>Dismiss</button>
    </div>
  ));
  render(
    <SessionContext value={session}>
      <ReplyInput
        signIn={({onDismiss}) => (
          <button onClick={onDismiss}>Sign in to reply</button>
        )}
        onReply={onReply}
      />
    </SessionContext>,
  );
}

async function startReply() {
  await userEvent.click(screen.getByRole('textbox', {name: 'Write a reply'}));
}

describe('ReplyInput', () => {
  it('shows a placeholder input until focused', () => {
    renderReplyInput();

    expect(
      screen.getByRole('textbox', {name: 'Write a reply'}),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the editor when focused', async () => {
    renderReplyInput();

    await startReply();

    expect(screen.getByRole('dialog', {name: 'Editor'})).toBeInTheDocument();
  });

  it('replies with the signed-in session', async () => {
    const onReply = vi.fn();
    renderReplyInput({onReply});
    await startReply();

    await userEvent.click(screen.getByRole('button', {name: 'Comment'}));

    expect(onReply).toHaveBeenCalledExactlyOnceWith(BODY, SESSION);
  });

  it('closes the editor when dismissed', async () => {
    renderReplyInput();
    await startReply();

    await userEvent.click(screen.getByRole('button', {name: 'Dismiss'}));

    expect(
      screen.getByRole('textbox', {name: 'Write a reply'}),
    ).toBeInTheDocument();
  });

  it('closes the editor on Escape', async () => {
    renderReplyInput();
    await startReply();
    screen.getByRole('button', {name: 'Comment'}).focus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks signed-out users to sign in', async () => {
    renderReplyInput({session: null});

    await startReply();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', {name: 'Sign in to reply'}),
    );
    expect(
      screen.getByRole('textbox', {name: 'Write a reply'}),
    ).toBeInTheDocument();
  });
});
