export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    const {deleteExpired} = await import('./lib/db/cleanup');
    deleteExpired(24);
    setInterval(() => deleteExpired(24), 60 * 60 * 1000);
  }
}
