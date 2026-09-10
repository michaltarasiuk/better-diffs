'use client';

import {createContext} from 'react';

import type {AnnotationMetadata} from '@/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

export const DiffHandleContext = createContext<
  React.RefObject<CodeViewHandle<AnnotationMetadata> | null>
>({current: null});
