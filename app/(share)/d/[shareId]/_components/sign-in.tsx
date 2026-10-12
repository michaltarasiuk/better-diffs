'use client';

import {Button, Spinner} from '@heroui/react';
import {getLineAnnotationName} from '@pierre/diffs';

import {GitHubIcon} from '@/auth/github-icon';
import type {DiffAnnotation} from '@/diffs/annotations';

import {useGitHubSignIn} from '../_hooks/use-github-sign-in';

type AnnotationLine = Omit<DiffAnnotation, 'metadata'>;

interface SignInProps {
  readonly line: AnnotationLine;
  readonly onDismiss?: () => void;
}

export function SignIn({line, onDismiss}: SignInProps) {
  const {isSigningIn, signIn} = useGitHubSignIn();

  const annotationName = getLineAnnotationName(line);

  return (
    <div className="flex flex-col gap-2 overflow-auto p-3 sm:flex-row-reverse">
      <Button
        id={`${annotationName}-sign-in-github`}
        isPending={isSigningIn}
        size="sm"
        className="w-full sm:w-auto"
        onPress={signIn}
      >
        {isSigningIn ? (
          <Spinner aria-hidden color="current" size="sm" />
        ) : (
          <GitHubIcon aria-hidden className="size-4" />
        )}
        {isSigningIn ? 'Signing in…' : 'Sign in'}
      </Button>

      <Button
        id={`${annotationName}-sign-in-cancel`}
        variant="ghost"
        size="sm"
        className="w-full sm:w-auto"
        onPress={onDismiss}
      >
        Cancel
      </Button>
    </div>
  );
}
