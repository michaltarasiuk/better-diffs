import {useEffect, useRef, useState} from 'react';

import {authClient} from '@/auth/client';
import {isDefined} from '@/utils/is-defined';

export function useGitHubSignIn() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const controllerRef = useRef<AbortController>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function signIn() {
    const controller = new AbortController();
    controllerRef.current = controller;
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
  }

  return {isSigningIn, signIn};
}
