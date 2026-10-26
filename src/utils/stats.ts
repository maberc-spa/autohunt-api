export type DailyCount = { date: string; count: number };

const toDayKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Start (UTC midnight) of the oldest day in a window of `days` ending today. */
export const windowStart = (days: number, now: Date = new Date()): Date => {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
};

/**
 * Counts dates per UTC day over the last `days` days (today included), oldest
 * first, with zero-filled gaps so charts get a continuous series.
 */
export const countByDay = (
  dates: Date[],
  days: number,
  now: Date = new Date()
): DailyCount[] => {
  const start = windowStart(days, now);
  const counts = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    counts.set(toDayKey(day), 0);
  }

  for (const date of dates) {
    const key = toDayKey(date);
    const current = counts.get(key);
    if (current !== undefined) counts.set(key, current + 1);
  }

  return [...counts].map(([date, count]) => ({ date, count }));
};
