'use client';

import {ThemeProvider as NextThemesProvider} from 'next-themes';

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <NextThemesProvider
      attribute={['class', 'data-theme']}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // React 19 treats executable <script> tags in components as errors.
      // application/json keeps the FOUC-prevention script but silences the warning.
      // https://github.com/pacocoursey/next-themes/issues/387
      scriptProps={{type: 'application/json'}}
    >
      {children}
    </NextThemesProvider>
  );
}
