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

  const sweep = () => {
    const now = Date.now();
    const i = nextUpcomingIndex(starts, now);
    heroes.forEach((el, n) => { el.hidden = n !== i; });
    // A companion card shows unless it has been, or is the hero itself.
    document.querySelectorAll<HTMLElement>('.js-next-item').forEach((el) => {
      const start = new Date(el.dataset.iso ?? '').getTime();
      el.hidden = hasFinished(start, now) || (i >= 0 && start === starts[i]);
    });
    if (empty) empty.hidden = i >= 0;
  };
  sweep();
  setInterval(sweep, MINUTE);
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
}
