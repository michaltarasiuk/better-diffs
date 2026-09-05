import './_globals.css';

import {cn} from '@heroui/styles';
import Script from 'next/script';
import {NuqsAdapter} from 'nuqs/adapters/next/app';

import {env} from '@/lib/env';
import {fontMono, fontSans} from '@/lib/fonts';

import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Better Diffs',
};

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={cn(fontSans.variable, fontMono.variable, 'h-dvh antialiased')}
    >
      <head>
        {env.NODE_ENV === 'development' && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            strategy="beforeInteractive"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="h-full bg-background font-sans text-foreground">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
