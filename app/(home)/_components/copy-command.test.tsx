// @vitest-environment jsdom

import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';

import {COPIED_FEEDBACK_MS, CopyCommand} from './copy-command';

const COMMAND = 'better-diffs --base main -- src/';

const writeText = vi.fn<(text: string) => Promise<void>>();

const {toastWarning} = vi.hoisted(() => ({
  toastWarning: vi.fn(),
}));

vi.mock('@heroui/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('@heroui/react')>();
  return {
    ...original,
    toast: {
      ...original.toast,
      warning: toastWarning,
    },
  };
});

function button() {
  return screen.getByRole('button');
}

function renderCopyCommand() {
  render(<CopyCommand label="Copy command" command={COMMAND} />);
}

/*
 * React Aria treats detail-0 clicks as keyboard activation, which is enough
 * to reach onPress without a full pointer sequence.
 */
async function copy() {
  fireEvent.click(button(), {detail: 0});
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset();
  toastWarning.mockReset();
  writeText.mockResolvedValue();
  /*
   * jsdom ships no Clipboard implementation, so navigator.clipboard has to
   * be installed before the component can reach for it.
   */
  Object.defineProperty(navigator, 'clipboard', {
    value: {writeText},
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CopyCommand', () => {
  it('shows the command next to a labelled button', () => {
    renderCopyCommand();

    expect(screen.getByText(COMMAND)).toBeInTheDocument();
    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('writes the command to the clipboard', async () => {
    renderCopyCommand();
    await copy();

    expect(writeText).toHaveBeenCalledWith(COMMAND);
  });

  it('confirms the copy, then returns to its idle label', async () => {
    renderCopyCommand();
    await copy();
    expect(button()).toHaveAccessibleName('Copied');

    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS));

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('keeps the confirmation up for the whole feedback window', async () => {
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));

    expect(button()).toHaveAccessibleName('Copied');
  });

  it('restarts the feedback window on a second copy', async () => {
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));

    expect(writeText).toHaveBeenCalledTimes(2);
    expect(button()).toHaveAccessibleName('Copied');
  });

  it('selects the command and warns when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('error'));
    renderCopyCommand();

    await copy();

    expect(button()).toHaveAccessibleName('Selected');
    const selection = window.getSelection();
    assert(isDefined(selection), 'expected selection');
    expect(selection.toString()).toBe(COMMAND);
    expect(toastWarning).toHaveBeenCalledWith('Clipboard unavailable', {
      description: 'Command selected. Press ⌘C or Ctrl+C to copy',
    });
  });

  it('returns to its idle label after selecting the command', async () => {
    writeText.mockRejectedValue(new Error('error'));
    renderCopyCommand();
    await copy();
    expect(button()).toHaveAccessibleName('Selected');

    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS));

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('warns to copy manually when the clipboard and selection are unavailable', async () => {
    writeText.mockRejectedValue(new Error('error'));
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    renderCopyCommand();

    await copy();

    expect(button()).toHaveAccessibleName('Copy command');
    expect(toastWarning).toHaveBeenCalledWith('Clipboard unavailable', {
      description: 'Copy the command manually',
    });
  });
});
