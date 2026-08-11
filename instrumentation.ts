let interval: ReturnType<typeof setInterval> | undefined;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || !process.env.VERCEL) {
    const {deleteExpired} = await import('./lib/db/cleanup');
    deleteExpired({maxAgeHours: 24});
    if (interval) {
      clearInterval(interval);
    }
    interval = setInterval(
      () => deleteExpired({maxAgeHours: 24}),
      60 * 60 * 1000,
    );
    interval.unref?.();
  }
}
