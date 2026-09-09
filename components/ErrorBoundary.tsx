'use client';

import React from 'react';

const INITIAL_STATE: ErrorBoundaryState = {
  didCatch: false,
};

interface ErrorBoundaryProps {
  readonly children: React.ReactNode;
  readonly fallback: React.ReactNode;
  readonly resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  didCatch: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state = INITIAL_STATE;

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {didCatch: true};
  }

  componentDidUpdate(
    prevProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState,
  ) {
    const {resetKeys} = this.props;
    const {didCatch} = this.state;

    if (
      prevState.didCatch &&
      didCatch &&
      keysDiffer(prevProps.resetKeys, resetKeys)
    ) {
      this.setState(INITIAL_STATE);
    }
  }

  render() {
    const {children, fallback} = this.props;

    if (this.state.didCatch) {
      return fallback;
    }

    return children;
  }
}

function keysDiffer(prevResetKeys: unknown[] = [], resetKeys: unknown[] = []) {
  return (
    prevResetKeys.length !== resetKeys.length ||
    prevResetKeys.some((key, index) => !Object.is(key, resetKeys[index]))
  );
}
