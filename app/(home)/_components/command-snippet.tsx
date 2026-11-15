'use client';

import {Button, toast} from '@heroui/react';
import {fbs} from 'fbtee';
import {CheckIcon, CopyIcon} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';

import {isDefined} from '#/utils/is-defined';

export const FEEDBACK_MS = 2_000;

interface CommandSnippetProps {
  readonly label: string;
  readonly command: string;
}

type CopyFeedback = 'idle' | 'copied' | 'selected';

function clearPendingTimeout(
  timeoutRef: React.RefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (isDefined(timeoutRef.current)) {
    clearTimeout(timeoutRef.current);
  }
}

function selectNodeContents(node: HTMLElement) {
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

export function CommandSnippet({label, command}: CommandSnippetProps) {
  const [feedback, setFeedback] = useState<CopyFeedback>('idle');
  const commandRef = useRef<React.ComponentRef<'code'>>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => () => clearPendingTimeout(timeoutRef), []);

  function showFeedback(next: Exclude<CopyFeedback, 'idle'>) {
    clearPendingTimeout(timeoutRef);
    setFeedback(next);
    timeoutRef.current = setTimeout(() => setFeedback('idle'), FEEDBACK_MS);
  }

  function selectCommand() {
    const commandNode = commandRef.current;
    const selected = isDefined(commandNode) && selectNodeContents(commandNode);

    if (selected) {
      showFeedback('selected');
    }

    toast.warning(
      fbs(
        'Clipboard unavailable',
        'Toast title when the browser refuses to copy the command',
      ),
      {
        description: selected
          ? fbs(
              'Command selected. Press ⌘C or Ctrl+C to copy',
              'Toast hint after the command text was selected for manual copying',
            )
          : fbs(
              'Copy the command manually',
              'Toast hint when the command could be neither copied nor selected',
            ),
      },
    );
  }

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(command);
      showFeedback('copied');
    } catch {
      selectCommand();
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-field border border-border bg-surface-secondary p-2 ps-3">
      <code
        ref={commandRef}
        className="min-w-0 flex-1 overflow-x-auto py-1.5 font-mono text-sm leading-relaxed whitespace-pre"
      >
        {command}
      </code>

      <Button
        aria-label={
          feedback === 'idle'
            ? label
            : feedback === 'copied'
              ? fbs('Copied', 'Copy button label after the command was copied')
              : fbs(
                  'Selected',
                  'Copy button label after the command text was selected',
                )
        }
        variant="ghost"
        size="sm"
        isIconOnly
        onPress={copyCommand}
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
