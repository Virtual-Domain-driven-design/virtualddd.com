/** Everything on a page that depends on the clock rather than on the build.
 *
 * Three behaviours, together because they share one question — has this
 * session been? — and answering it differently in three places is how a page
 * ends up offering an RSVP to a session that finished an hour ago.
 *
 *   - which upcoming session is "next" (`.js-next`, `.js-next-item`)
 *   - whether a join link is worth showing yet (`.js-live`)
 *   - the countdown (`.js-countdown`)
 *
 * The "next" rule itself lives in `src/lib/upcoming.ts`, because the build
 * needs it too and the two must not disagree.
 */
import { nextUpcomingIndex, hasFinished } from '../lib/upcoming';

/** A join link is noise until shortly before, and useless well after. */
const LIVE_BEFORE = 2 * 60 * 60 * 1000;
const LIVE_AFTER = 3 * 60 * 60 * 1000;
const MINUTE = 60_000;

/** Join links: shown only around the session they belong to. */
function initLiveLinks(): void {
  document.querySelectorAll<HTMLElement>('.js-live').forEach((el) => {
    const iso = el.dataset.iso;
    if (!iso) return;
    const start = new Date(iso).getTime();
    const sync = () => {
      const now = Date.now();
      el.hidden = now < start - LIVE_BEFORE || now > start + LIVE_AFTER;
    };
    sync();
    setInterval(sync, MINUTE);
  });
}

/** Which upcoming session leads the page — decided here, not at build time.
 *
 * Pages that lead with a session render every upcoming one, soonest first.
 * Without this sweep the choice freezes at whatever was next when the site was
 * last built, so a session that has been and gone keeps its RSVP hero and a
 * countdown stuck at "Happening now" until someone rebuilds. */
function initNextSession(): void {
  const heroes = [...document.querySelectorAll<HTMLElement>('.js-next')];
  if (!heroes.length) return;

  const starts = heroes.map((el) => new Date(el.dataset.iso ?? '').getTime());
  const empty = document.querySelector<HTMLElement>('[data-next-empty]');
  // The list of everything after the hero, and the count in its heading. Both
  // are swept rather than built, for the same reason the hero is: the number
  // shipped in the HTML is right on the day of the build and wrong the morning
  // after a session, and a heading that says "2 more announced" above one row
  // is worse than no heading at all.
  const then = document.querySelector<HTMLElement>('[data-next-then]');
  const count = document.querySelector<HTMLElement>('[data-next-count]');

  const sweep = () => {
    const now = Date.now();
    const i = nextUpcomingIndex(starts, now);
    heroes.forEach((el, n) => { el.hidden = n !== i; });
    // A companion card shows unless it has been, or is the hero itself.
    let showing = 0;
    document.querySelectorAll<HTMLElement>('.js-next-item').forEach((el) => {
      const start = new Date(el.dataset.iso ?? '').getTime();
      el.hidden = hasFinished(start, now) || (i >= 0 && start === starts[i]);
      if (!el.hidden) showing += 1;
    });
    if (empty) empty.hidden = i >= 0;
    // Anything that only makes sense while a session is coming — the "Next
    // session" label above the hero, and the section it heads. Without this the
    // label outlived the thing it labelled: the last session passed, the hero
    // hid itself, and the page said "Next session" over an empty space with the
    // "nothing scheduled" block underneath it.
    document.querySelectorAll<HTMLElement>('[data-next-any]').forEach((el) => { el.hidden = i < 0; });
    if (count) {
      count.textContent = showing
        ? `${showing} more announced`
        : 'Nothing else announced';
    }
    // Nothing upcoming at all: the empty header above has taken over, and a
    // "Then" with no rows under it would be the same hole in a new shape.
    if (then) then.hidden = i < 0;
  };
  sweep();
  setInterval(sweep, MINUTE);
}

/** "In 29d", on each row of the list under the hero.
 *
 * Days rather than a date, because a row already carries the date and the
 * question a reader is actually asking is how far away it is. Rounded up, so
 * something happening tomorrow afternoon reads "in 1d" and not "in 0d". */
function initDaysAway(): void {
  document.querySelectorAll<HTMLElement>('.js-days').forEach((el) => {
    const iso = el.dataset.iso;
    if (!iso) return;
    const target = new Date(iso).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'Today'; return; }
      const days = Math.ceil(diff / 86400000);
      el.textContent = days === 1 ? 'Tomorrow' : `In ${days}d`;
    };
    tick();
    setInterval(tick, MINUTE);
  });
}

/** "Starts in 9d 17h 0m 22s", until it does. */
function initCountdowns(): void {
  document.querySelectorAll<HTMLElement>('.js-countdown').forEach((el) => {
    const iso = el.dataset.iso;
    if (!iso) return;
    const target = new Date(iso).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { el.textContent = 'Happening now'; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `Starts in ${d}d ${h}h ${m}m ${s}s`;
    };
    tick();
    setInterval(tick, 1000);
  });
}

export function initSessionTiming(): void {
  initLiveLinks();
  initNextSession();
  initCountdowns();
  initDaysAway();
}
