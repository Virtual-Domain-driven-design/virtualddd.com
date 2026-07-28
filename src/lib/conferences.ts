/** Where a conference sits in the row, and whether its dates still stand.
 *
 * Like `upcoming.ts`, this rule is free of Astro, the DOM and the content
 * collections, because it runs twice: at build time to order the cards, and in
 * the browser to keep that order right as time passes. That second run is not
 * belt and braces here — it is the only thing that works. The site rebuilds
 * when the Notion sync produces a diff, and a date going by is not a diff, so
 * a page built in June would still be calling last month's conference the next
 * one. `tests/unit/conferences.test.mjs` is the specification.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The instant a conference is over: the end of its last day.
 *
 * Notion hands us whole days, so the last day's date parses to its midnight —
 * the moment it *starts*. A conference is not over on the morning of its final
 * day, and a card that says "no new dates announced yet" while people are still
 * in the room is worse than one showing a date that has just passed. */
export const endOfRun = (startMs: number, endMs?: number) => (endMs ?? startMs) + DAY_MS;

/** Have these dates been and gone, so the card should stop claiming them? */
export const hasPassed = (startMs: number, endMs: number | undefined, now: number) =>
  endOfRun(startMs, endMs) <= now;

interface Dated {
  startMs: number;
  endMs?: number;
}

/**
 * Soonest first, with editions that have already happened pushed to the end.
 *
 * Past ones are ordered most recent first, so the conference that just finished
 * sits next to the ones still to come rather than behind a two-year-old
 * edition. The row stays full either way: nothing is dropped, because a
 * conference whose next edition is not announced yet has not gone anywhere, and
 * an empty gap says less than a card saying so.
 */
export function orderConferences<T extends Dated>(items: readonly T[], now: number): T[] {
  const past = (c: T) => hasPassed(c.startMs, c.endMs, now);
  return [...items].sort((a, b) => {
    const pa = past(a);
    const pb = past(b);
    if (pa !== pb) return pa ? 1 : -1;
    return pa ? b.startMs - a.startMs : a.startMs - b.startMs;
  });
}
