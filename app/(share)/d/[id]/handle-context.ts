'use client';

import {createContext} from 'react';
import type {CodeViewHandle} from '@pierre/diffs/react';

import type {AnnotationMetadata} from '@/diffs/options';

export const HandleContext = createContext<
  React.RefObject<CodeViewHandle<AnnotationMetadata, null> | null>
>({current: null});
