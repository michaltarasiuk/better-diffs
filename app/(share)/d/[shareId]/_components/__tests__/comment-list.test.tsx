// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import type {SerializedEditorState} from 'lexical';
import {describe, expect, it} from 'vitest';

import type {CommentState} from '@/events/state';
import {newId} from '@/utils/new-id';

import {CommentList} from '../comment-list';

function body(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: [
        {
          type: 'paragraph',
          version: 1,
          direction: null,
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
          children: [
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
            },
          ],
        },
      ],
    },
  } as unknown as SerializedEditorState;
}

function comment(name: string, text: string): CommentState {
  return {
    id: newId(),
    threadId: newId(),
    actorId: name,
    actor: {name, image: null},
    body: body(text),
    createdAt: new Date().toISOString(),
  };
}

describe('CommentList', () => {
  it('renders each comment with its author', () => {
    render(
      <CommentList
        comments={[comment('Alice', 'Looks good'), comment('Bob', 'Agreed')]}
      />,
    );

    const comments = screen.getAllByRole('textbox', {name: 'Comment'});
    expect(comments.map((element) => element.textContent)).toEqual([
      'Looks good',
      'Agreed',
    ]);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders comments read-only', () => {
    render(<CommentList comments={[comment('Alice', 'Looks good')]} />);

    expect(screen.getByRole('textbox', {name: 'Comment'})).toHaveAttribute(
      'contenteditable',
      'false',
    );
  });

  it('separates comments', () => {
    render(
      <CommentList
        comments={[
          comment('Alice', 'One'),
          comment('Bob', 'Two'),
          comment('Carol', 'Three'),
        ]}
      />,
    );

    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('renders nothing without comments', () => {
    render(<CommentList comments={[]} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
