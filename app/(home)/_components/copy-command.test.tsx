// @vitest-environment jsdom

import type * as HerouiReact from '@heroui/react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import dedent from 'dedent';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';
import {COPIED_FEEDBACK_MS, CopyCommand} from './copy-command';

const COMMAND = dedent`
  BASE_URL='${process.env.BASE_URL}'
  curl -fsSL "$BASE_URL/install.sh" | sh
`;

const writeText = vi.fn<(text: string) => Promise<void>>();

const {toastWarning} = vi.hoisted(() => ({
  toastWarning: vi.fn(),
}));

vi.mock('@heroui/react', async (importOriginal) => {
  const original = (await importOriginal()) as typeof HerouiReact;
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

function command() {
  return button().previousElementSibling as HTMLElement;
}

function renderCopyCommand() {
  render(<CopyCommand label="Copy command" command={COMMAND} />);
}

const REACT_ARIA_KEYBOARD_ACTIVATION = {detail: 0} as const;

async function copy() {
  fireEvent.click(button(), REACT_ARIA_KEYBOARD_ACTIVATION);
  await act(async () => {
    await Promise.resolve();
  });
}

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: {writeText},
    configurable: true,
  });
});

beforeEach(() => {
  vi.useFakeTimers();

  writeText.mockReset();
  writeText.mockResolvedValue();

  toastWarning.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CopyCommand', () => {
  it('shows the command next to a labelled button', () => {
    renderCopyCommand();

    expect(command().textContent).toBe(COMMAND);
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
    writeText.mockRejectedValue(new Error());
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
    writeText.mockRejectedValue(new Error());
    renderCopyCommand();
    await copy();
    expect(button()).toHaveAccessibleName('Selected');

    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS));

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('warns to copy manually when the clipboard and selection are unavailable', async () => {
    writeText.mockRejectedValue(new Error());
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    renderCopyCommand();

    await copy();

    expect(button()).toHaveAccessibleName('Copy command');
    expect(toastWarning).toHaveBeenCalledWith('Clipboard unavailable', {
      description: 'Copy the command manually',
    });
  });
});
