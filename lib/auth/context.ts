'use client';

import {createContext} from 'react';

import type {authClient} from '@/lib/auth/client';

export const SessionContext = createContext<
  typeof authClient.$Infer.Session | null
>(null);
