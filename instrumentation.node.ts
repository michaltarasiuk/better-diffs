import {isPresent} from '@/lib/utils/is-present';

import {env} from './lib/env';

let interval: ReturnType<typeof setInterval> | null = null;

if (!env.VERCEL) {
  const {deleteExpiredShares} = await import('./lib/db/shares');
  deleteExpiredShares({maxAgeHours: 24});
  if (isPresent(interval)) {
    clearInterval(interval);
  }
  interval = setInterval(
    () => deleteExpiredShares({maxAgeHours: 24}),
    60 * 60 * 1000,
  );
  interval.unref?.();
}
