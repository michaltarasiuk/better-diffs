import {afterEach} from 'vitest';

// Most unit tests run in the node environment, where Testing Library is dead
// weight, so load it only for files that opt into jsdom. Its automatic cleanup
// needs a global afterEach, which Vitest provides only with globals enabled.
if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest');
  const {cleanup} = await import('@testing-library/react');
  afterEach(cleanup);
}
