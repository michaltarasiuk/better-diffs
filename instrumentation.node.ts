import {env} from './env';
import {isDefined} from './utils/defined';

let interval: ReturnType<typeof setInterval> | null = null;

if (!env.VERCEL) {
  const {deleteExpiredShares} = await import('./data/shares');
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
