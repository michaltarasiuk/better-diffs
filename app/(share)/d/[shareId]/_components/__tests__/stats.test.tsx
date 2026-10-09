// @vitest-environment jsdom

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {computeDiffStats} from '@/diffs/stats';

import {Stats} from '../stats';

function statValue(label: string) {
  return screen.getByText(label).nextElementSibling;
}

describe('Stats', () => {
  it('shows formatted diff stats', () => {
    render(
      <Stats
        stats={computeDiffStats([
          {hunks: [{additionLines: 1200, deletionLines: 34}]},
        ])}
      />,
    );

    expect(statValue('Files')).toHaveTextContent('1');
    expect(statValue('Additions')).toHaveTextContent('1,200');
    expect(statValue('Deletions')).toHaveTextContent('34');
    expect(statValue('Lines')).toHaveTextContent('1,234');
  });

  it('starts expanded', () => {
    render(<Stats stats={computeDiffStats([])} />);

    expect(screen.getByRole('button', {name: 'Stats'})).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
