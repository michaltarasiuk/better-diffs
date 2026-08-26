import './_globals.css';

import {Providers} from '@/app/_providers';

import type {Metadata} from 'next';

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
