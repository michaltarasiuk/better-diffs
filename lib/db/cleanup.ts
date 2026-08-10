import {sql, lt} from 'drizzle-orm';
import {db} from '.';
import {shares} from './schema';

export function deleteExpired(maxAgeHours: number) {
  return db
    .delete(shares)
    .where(
      lt(
        shares.lastVisitedAt,
        sql`datetime('now', ${`-${maxAgeHours} hours`})`,
      ),
    )
    .run();
}
