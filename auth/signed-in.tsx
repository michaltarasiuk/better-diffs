'use client';

import {use} from 'react';

import {isDefined} from '#/utils/is-defined';

import {SessionContext} from './context';
import type {Session} from './server';

interface SignedInProps {
  readonly fallback: React.ReactNode;
  readonly children: (session: Session) => React.ReactNode;
}

export function SignedIn({fallback, children}: SignedInProps) {
  const session = use(SessionContext);
  return isDefined(session) ? children(session) : fallback;
}
