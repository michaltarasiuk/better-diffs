// @vitest-environment jsdom

import type * as HerouiReact from '@heroui/react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {isDefined} from '@/utils/is-defined';
import {INSTALL_COMMAND} from '../_lib/install-command';
import {COPIED_FEEDBACK_MS, CopyCommand} from './copy-command';

const writeText = vi.fn<(text: string) => Promise<void>>();

const {toastWarning} = vi.hoisted(() => ({toastWarning: vi.fn()}));

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
  render(<CopyCommand label="Copy command" command={INSTALL_COMMAND} />);
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
  writeText.mockResolvedValue();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyCommand', () => {
  it('renders the install command', () => {
    renderCopyCommand();

    expect(command().textContent).toBe(INSTALL_COMMAND);
  });

  it('labels the copy button for assistive tech', () => {
    renderCopyCommand();

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('writes the command to the clipboard', async () => {
    renderCopyCommand();
    await copy();

    expect(writeText).toHaveBeenCalledExactlyOnceWith(INSTALL_COMMAND);
  });

  it('confirms the copy', async () => {
    renderCopyCommand();
    await copy();

    expect(button()).toHaveAccessibleName('Copied');
  });

  it('returns to its idle label after copying', async () => {
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS));

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('keeps the confirmation up for the whole feedback window', async () => {
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));

    expect(button()).toHaveAccessibleName('Copied');
  });

  it('writes to the clipboard again during the feedback window', async () => {
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));
    await copy();

    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it('keeps the confirmation up after a second copy', async () => {
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS - 1));

    expect(button()).toHaveAccessibleName('Copied');
  });

  it('selects the command when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    renderCopyCommand();

    await copy();

    const selection = window.getSelection();
    if (!isDefined(selection)) {
      throw new Error('Selection missing');
    }
    expect(selection.toString()).toBe(INSTALL_COMMAND);
  });

  it('labels the button Selected when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    renderCopyCommand();

    await copy();

    expect(button()).toHaveAccessibleName('Selected');
  });

  it('warns that the command was selected when the clipboard is unavailable', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    renderCopyCommand();

    await copy();

    expect(toastWarning).toHaveBeenCalledExactlyOnceWith(
      'Clipboard unavailable',
      {description: 'Command selected. Press ⌘C or Ctrl+C to copy'},
    );
  });

  it('returns to its idle label after selecting the command', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    renderCopyCommand();
    await copy();
    await act(() => vi.advanceTimersByTimeAsync(COPIED_FEEDBACK_MS));

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('keeps the idle label when selection is unavailable', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    renderCopyCommand();

    await copy();

    expect(button()).toHaveAccessibleName('Copy command');
  });

  it('warns to copy manually when selection is unavailable', async () => {
    writeText.mockRejectedValue(new Error('Clipboard write failed'));
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    renderCopyCommand();

    await copy();

    expect(toastWarning).toHaveBeenCalledExactlyOnceWith(
      'Clipboard unavailable',
      {description: 'Copy the command manually'},
    );
  });
});
