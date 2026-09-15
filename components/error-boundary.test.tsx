// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ErrorBoundary} from './error-boundary';

function ThrowingChild({shouldThrow}: {readonly shouldThrow: boolean}) {
  if (shouldThrow) {
    throw new Error('Child render failed');
  }
  return <span>content</span>;
}

function renderBoundary(props: {shouldThrow: boolean; resetKeys?: unknown[]}) {
  const ui = ({shouldThrow, resetKeys}: typeof props) => (
    <ErrorBoundary fallback={<span>fallback</span>} resetKeys={resetKeys}>
      <ThrowingChild shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
  const {rerender} = render(ui(props));

  return {rerender: (next: typeof props) => rerender(ui(next))};
}

/*
 * React logs every error it hands to a boundary, which would drown the
 * reporter in expected stack traces.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children while nothing throws', () => {
    renderBoundary({shouldThrow: false});

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('swaps in the fallback once a child throws', () => {
    renderBoundary({shouldThrow: true});

    expect(screen.getByText('fallback')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('recovers when a reset key changes', () => {
    const {rerender} = renderBoundary({shouldThrow: true, resetKeys: ['a']});

    rerender({shouldThrow: false, resetKeys: ['b']});

    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('recovers when the reset keys change length', () => {
    const {rerender} = renderBoundary({shouldThrow: true, resetKeys: ['a']});

    rerender({shouldThrow: false, resetKeys: ['a', 'b']});

    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('compares reset keys by value rather than by identity', () => {
    const {rerender} = renderBoundary({shouldThrow: true, resetKeys: ['a']});

    rerender({shouldThrow: false, resetKeys: ['a']});

    expect(screen.getByText('fallback')).toBeInTheDocument();
  });

  it('stays in the fallback when no reset keys are given', () => {
    const {rerender} = renderBoundary({shouldThrow: true});

    rerender({shouldThrow: false});

    expect(screen.getByText('fallback')).toBeInTheDocument();
  });

  it('catches again when the child still throws after a reset', () => {
    const {rerender} = renderBoundary({shouldThrow: true, resetKeys: ['a']});

    rerender({shouldThrow: true, resetKeys: ['b']});

    expect(screen.getByText('fallback')).toBeInTheDocument();
  });
});
