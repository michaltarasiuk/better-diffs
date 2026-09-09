'use client';

import {Button} from '@heroui/react';
import {CheckIcon, CopyIcon} from 'lucide-react';
import {useRef, useState} from 'react';

import {isDefined} from '@/lib/utils/defined';

const COPIED_FEEDBACK_MS = 2_000;

interface CopyCommandProps {
  readonly label: string;
  readonly command: string;
}

export function CopyCommand({label, command}: CopyCommandProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  return (
    <div className="flex items-start gap-2 rounded-field border border-border bg-surface-secondary p-2 ps-3">
      <code className="min-w-0 flex-1 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {command}
      </code>

      <Button
        aria-label={isCopied ? 'Copied' : label}
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={async () => {
          try {
            if (isDefined(timeoutRef.current)) {
              clearTimeout(timeoutRef.current);
            }

            await navigator.clipboard.writeText(command);

            setIsCopied(true);
            timeoutRef.current = setTimeout(
              () => setIsCopied(false),
              COPIED_FEEDBACK_MS,
            );
          } catch {
            /*
             * navigator.clipboard.writeText() rejects outside secure
             * contexts with no fallback API. Rely on manual selection in
             * the DOM instead.
             */
          }
        }}
      >
        {isCopied ? (
          <CheckIcon aria-hidden className="size-4 text-success" />
        ) : (
          <CopyIcon aria-hidden className="size-4" />
        )}
      </Button>
    </div>
  );
}
