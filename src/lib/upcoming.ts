/** When a session stops being "the next session".
 *
 * This rule is deliberately in one place and free of Astro, the DOM and the
 * content collections, because it runs twice: once at build time to decide what
 * to render, and once in the browser to keep the choice correct as time passes
 * without a rebuild. `tests/unit/upcoming.test.mjs` is the specification.
 */

/** A session stays "next" for three hours after its start.
 *
 * Not zero: someone arriving ten minutes late wants the join link for the
 * session happening now, not an RSVP for next month. Three hours matches the
 * window the `.js-live` join links use in BaseLayout, so the hero and its
 * buttons agree about when a session is over. */
export const SESSION_GRACE_MS = 3 * 60 * 60 * 1000;

/** Has this session finished, so it belongs in the archive? */
export const hasFinished = (startMs: number, now: number, grace = SESSION_GRACE_MS) =>
  startMs + grace <= now;

/**
 * Index of the first session that has not finished yet, or -1 if they all have.
 *
 * `startsMs` must be in chronological order, soonest first — the same order
 * `splitSessions().upcoming` produces. The first entry is not assumed to be the
 * answer: that assumption is exactly what froze the home page to whichever
 * session happened to be next when the site was last built.
 */
export function nextUpcomingIndex(startsMs: number[], now: number, grace = SESSION_GRACE_MS): number {
  for (let i = 0; i < startsMs.length; i++) {
    if (!hasFinished(startsMs[i], now, grace)) return i;
  }
  return -1;
}
