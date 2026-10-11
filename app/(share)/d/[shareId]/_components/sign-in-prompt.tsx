'use client';

import {Button, Spinner} from '@heroui/react';
import {typographyVariants} from '@heroui/styles';
import {getLineAnnotationName} from '@pierre/diffs';
import {useEffect, useRef, useState} from 'react';

import {authClient} from '@/auth/client';
import {GitHubIcon} from '@/auth/github-icon';
import type {DiffAnnotation} from '@/diffs/annotations';
import {isDefined} from '@/utils/is-defined';

type AnnotationLine = Omit<DiffAnnotation, 'metadata'>;

interface SignInPromptProps {
  readonly action: 'comment' | 'reply';
  readonly line: AnnotationLine;
  readonly onDismiss?: () => void;
}

export function SignInPrompt({action, line, onDismiss}: SignInPromptProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
      <p
        className={typographyVariants({type: 'body-sm'}).base({
          className: 'text-muted',
        })}
      >
        Sign in to {action}
      </p>
      <div className="flex items-center gap-2">
        <SignInActions line={line} onDismiss={onDismiss} />
      </div>
    </div>
  );
}

interface SignInActionsProps {
  readonly line: AnnotationLine;
  readonly onDismiss?: () => void;
}

function SignInActions({line, onDismiss}: SignInActionsProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const signInRef = useRef<AbortController>(null);

  useEffect(() => {
    return () => signInRef.current?.abort();
  }, []);

  const annotationName = getLineAnnotationName(line);

  return (
    <>
      <Button
        id={`${annotationName}-sign-in-cancel`}
        variant="ghost"
        size="sm"
        onPress={() => onDismiss?.()}
      >
        Cancel
      </Button>

      <Button
        id={`${annotationName}-sign-in-github`}
        size="sm"
        isPending={isSigningIn}
        onPress={async () => {
          const controller = new AbortController();
          signInRef.current = controller;
          setIsSigningIn(true);
          try {
            const {url} = await authClient.signIn.social({
              provider: 'github',
              callbackURL: window.location.href,
              disableRedirect: true,
              fetchOptions: {throw: true, signal: controller.signal},
            });
            controller.signal.throwIfAborted();
            if (!isDefined(url)) {
              throw new Error('Sign-in response has no redirect URL');
            }
            // The page stays interactive until GitHub responds, so a dismiss
            // after this point has to cancel the pending navigation.
            controller.signal.addEventListener('abort', () => window.stop());
            window.location.assign(url);
          } catch {
            setIsSigningIn(false);
          }
        }}
      >
        {({isPending}) => (
          <>
            {isPending ? (
              <Spinner aria-hidden color="current" size="sm" />
            ) : (
              <GitHubIcon aria-hidden className="size-4" />
            )}
            {isPending ? 'Signing in…' : 'Continue with GitHub'}
          </>
        )}
      </Button>
    </>
  );
}
