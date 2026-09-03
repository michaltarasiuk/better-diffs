'use client';

import {Button} from '@heroui/react';
import {CheckIcon, CopyIcon} from 'lucide-react';
import {useEffect, useState} from 'react';

const COPIED_FEEDBACK_MS = 2000;

interface CopyCommandProps {
  readonly command: string;
  readonly label: string;
}

export function CopyCommand({command, label}: CopyCommandProps) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeout = setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  return (
    <div className="bg-surface-secondary border-border rounded-field flex items-start gap-2 border p-2 ps-3">
      <code className="min-w-0 flex-1 py-1.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {command}
      </code>
      <Button
        aria-label={isCopied ? 'Copied' : label}
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setIsCopied(true);
          } catch {
            /*
             * Clipboard access is denied outside secure contexts, and there is
             * nothing to recover: the command stays selectable in the DOM.
             */
          }
        }}
      >
        {isCopied ? (
          <CheckIcon aria-hidden className="text-success size-4" />
        ) : (
          <CopyIcon aria-hidden className="size-4" />
        )}
      </Button>
    </div>
  );
}
