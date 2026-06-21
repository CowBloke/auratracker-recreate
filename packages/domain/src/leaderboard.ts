/** Assigns dense 1-based ranks to a list already sorted by value descending. */
export function withRanks<T extends { value: number }>(rows: T[]): (T & { rank: number })[] {
  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}
