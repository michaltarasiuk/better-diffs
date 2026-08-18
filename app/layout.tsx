import './_globals.css';

import type {Metadata} from 'next';

import {Providers} from '@/app/_providers';

export const metadata: Metadata = {
  title: 'Better Diffs',
};

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
