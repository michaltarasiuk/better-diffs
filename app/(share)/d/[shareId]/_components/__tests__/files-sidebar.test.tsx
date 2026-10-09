// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';

import {FilesSidebar} from '../files-sidebar';

function separator() {
  return screen.getByRole('separator', {name: 'Resize sidebar'});
}

function sidebarWidth() {
  return screen.getByRole('complementary', {name: 'Files'}).style.width;
}

async function pressKey(key: string, times = 1) {
  const user = userEvent.setup();
  separator().focus();
  for (let i = 0; i < times; i++) {
    await user.keyboard(`{${key}}`);
  }
}

describe('FilesSidebar', () => {
  it('renders its children at the default width', () => {
    render(<FilesSidebar>Tree</FilesSidebar>);

    expect(screen.getByText('Tree')).toBeInTheDocument();
    expect(sidebarWidth()).toBe('320px');
    expect(separator()).toHaveAttribute('aria-valuenow', '320');
  });

  it('resizes with the arrow keys', async () => {
    render(<FilesSidebar>Tree</FilesSidebar>);

    await pressKey('ArrowRight');
    expect(sidebarWidth()).toBe('336px');

    await pressKey('ArrowLeft', 2);
    expect(sidebarWidth()).toBe('304px');
  });

  it('clamps the width', async () => {
    render(<FilesSidebar>Tree</FilesSidebar>);

    await pressKey('ArrowRight', 20);
    expect(separator()).toHaveAttribute('aria-valuenow', '480');

    await pressKey('ArrowLeft', 20);
    expect(separator()).toHaveAttribute('aria-valuenow', '240');
  });
});
