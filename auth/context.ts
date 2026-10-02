'use client';

import {createContext} from 'react';

import type {Session} from './server';

export const SessionContext = createContext<Session | null>(null);
