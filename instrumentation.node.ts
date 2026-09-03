import {env} from './lib/env';
import {isDefined} from './lib/utils/defined';

let interval: ReturnType<typeof setInterval> | null = null;

if (!env.VERCEL) {
  const {deleteExpiredShares} = await import('./lib/db/shares');
  await deleteExpiredShares({maxAgeHours: 24});
  if (isDefined(interval)) {
    clearInterval(interval);
  }
  interval = setInterval(
    () => void deleteExpiredShares({maxAgeHours: 24}),
    60 * 60 * 1000,
  );
  interval.unref?.();
}
