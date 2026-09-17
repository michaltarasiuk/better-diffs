// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ErrorBoundary} from './error-boundary';

const CHILD = 'Child content';
const FALLBACK = 'Error fallback';

let throws = false;

function Child() {
  if (throws) {
    throw new Error('Render failed');
  }

  return <div>{CHILD}</div>;
}

function boundary(resetKeys?: unknown[]) {
  return (
    <ErrorBoundary resetKeys={resetKeys} fallback={<div>{FALLBACK}</div>}>
      <Child />
    </ErrorBoundary>
  );
}

function renderBoundary(resetKeys?: unknown[]) {
  return render(boundary(resetKeys));
}

beforeEach(() => {
  throws = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    renderBoundary();

    expect(screen.getByText(CHILD)).toBeInTheDocument();
  });

  it('renders the fallback when a child throws', () => {
    throws = true;
    renderBoundary();

    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(CHILD)).not.toBeInTheDocument();
  });

  it('resets when resetKeys change after an error', () => {
    throws = true;
    const view = renderBoundary([1]);

    expect(screen.getByText(FALLBACK)).toBeInTheDocument();

    throws = false;
    view.rerender(boundary([2]));

    expect(screen.getByText(CHILD)).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
  });
});
