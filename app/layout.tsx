import './_globals.css';

import Script from 'next/script';
import {NuqsAdapter} from 'nuqs/adapters/next/app';

import {env} from '@/lib/env';

import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Better Diffs',
};

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className="h-dvh">
      <head>
        {env.NODE_ENV === 'development' && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="beforeInteractive"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="h-full bg-background text-foreground">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
