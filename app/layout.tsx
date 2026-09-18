import './globals.css';

import type {Metadata, Viewport} from 'next';
import Script from 'next/script';
import {cn} from '@heroui/styles';
import {NuqsAdapter} from 'nuqs/adapters/next/app';

import {env} from '@/env';
import {fontMono, fontSans} from '@/fonts';
import {ToastProvider} from '@/app/_components/toast-provider';

export const metadata: Metadata = {
  title: 'Better Diffs',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <ToastProvider />
      </body>
    </html>
  );
}
