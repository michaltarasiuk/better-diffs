'use client';

import {ThemeProvider as NextThemesProvider} from 'next-themes';
import {NuqsAdapter} from 'nuqs/adapters/next/app';

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export function Providers({children}: ProvidersProps) {
  return (
    <NextThemesProvider
      defaultTheme="system"
      attribute={['class', 'data-theme']}
      // React 19 warns on executable <script> tags inside components.
      // application/json keeps the FOUC-prevention script without the warning.
      // https://github.com/pacocoursey/next-themes/issues/387
      scriptProps={{type: 'application/json'}}
      enableSystem
      disableTransitionOnChange
    >
      <NuqsAdapter>{children}</NuqsAdapter>
    </NextThemesProvider>
  );
}
