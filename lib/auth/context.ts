'use client';

import {createContext} from 'react';

import type {Session} from '@/lib/auth';

export const SessionContext = createContext<Session | null>(null);
