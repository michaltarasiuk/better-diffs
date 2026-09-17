'use client';

import {createContext} from 'react';

import type {Session} from './client';

export const SessionContext = createContext<Session | null>(null);
