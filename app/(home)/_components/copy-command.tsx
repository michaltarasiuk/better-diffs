'use client';

import {type ComponentRef, useRef, useState} from 'react';
import {Button, toast} from '@heroui/react';
import {CheckIcon, CopyIcon} from 'lucide-react';

import {isDefined} from '@/utils/defined';

export const COPIED_FEEDBACK_MS = 2_000;

interface CopyCommandProps {
  readonly label: string;
  readonly command: string;
}

type CopyFeedback = 'idle' | 'copied' | 'selected';

function selectNodeContents(node: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!isDefined(selection)) {
    return false;
  }

  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

export function CopyCommand({label, command}: CopyCommandProps) {
  const [feedback, setFeedback] = useState<CopyFeedback>('idle');
  const commandRef = useRef<ComponentRef<'code'>>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const buttonLabel =
    feedback === 'copied'
      ? 'Copied'
      : feedback === 'selected'
        ? 'Selected'
        : label;

  return (
    <div className="flex items-start gap-2 rounded-field border border-border bg-surface-secondary p-2 ps-3">
      <code
        ref={commandRef}
        className="min-w-0 flex-1 py-1.5 font-mono text-sm leading-relaxed whitespace-pre-wrap"
      >
        {command}
      </code>

      <Button
        aria-label={buttonLabel}
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={async () => {
          if (isDefined(timeoutRef.current)) {
            clearTimeout(timeoutRef.current);
          }

          try {
            await navigator.clipboard.writeText(command);
            setFeedback('copied');
          } catch {
            /*
             * Clipboard API rejects outside secure contexts. Select the
             * command in the DOM and surface a toast so the user can copy
             * manually.
             */
            const commandNode = commandRef.current;
            const selected =
              isDefined(commandNode) && selectNodeContents(commandNode);

            if (selected) {
              setFeedback('selected');
            }

            toast.warning('Clipboard unavailable', {
              description: selected
                ? 'Command selected. Press ⌘C or Ctrl+C to copy'
                : 'Copy the command manually',
            });
          } finally {
            timeoutRef.current = setTimeout(
              () => setFeedback('idle'),
              COPIED_FEEDBACK_MS,
            );
          }
        }}
      >
        {feedback === 'copied' ? (
          <CheckIcon aria-hidden className="size-4 text-success" />
        ) : (
          <CopyIcon aria-hidden className="size-4" />
        )}
      </Button>
    </div>
  );
}
