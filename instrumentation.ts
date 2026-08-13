let interval: ReturnType<typeof setInterval> | undefined;

export async function register() {
  if (process.env.VERCEL || process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  const {deleteExpiredShares} = await import('./lib/db/shares');
  deleteExpiredShares({maxAgeHours: 24});
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(
    () => deleteExpiredShares({maxAgeHours: 24}),
    60 * 60 * 1000,
  );
  interval.unref?.();
}
