'use client';

import {createContext} from 'react';

import type {AuthSession} from '@/lib/auth';

export const SessionContext = createContext<AuthSession>(null);
