/** Keeps the conference row honest as its dates go by.
 *
 * The build orders the cards and decides which editions have been, but a
 * conference ending is not a Notion edit, so it produces no diff, so it
 * triggers no rebuild. Without this sweep a page built in April would still be
 * leading with a conference that finished in May.
 *
 * Two corrections, both of them things the build got right at the time:
 *   - an edition that has now finished drops to the end of the row
 *   - its date line stops claiming dates and says none are announced
 *
 * The order itself lives in `src/lib/conferences.ts`, because the build needs
 * it too and the two must not disagree.
 */
import { hasPassed, orderConferences } from '../lib/conferences';

const HOUR = 60 * 60 * 1000;
const NO_DATES = 'No new dates announced yet';

export function initConferenceTiming(): void {
  const row = document.querySelector<HTMLElement>('[data-test="conferences"]');
  if (!row) return;
  const cards = [...row.querySelectorAll<HTMLElement>('[data-test="conference-card"]')];
  if (!cards.length) return;

  // The card ships its raw dates rather than a verdict, so the same functions
  // the build used can be applied here to the same inputs.
  const items = cards.map((el) => ({
    el,
    startMs: Date.parse(el.dataset.start ?? ''),
    endMs: el.dataset.end ? Date.parse(el.dataset.end) : undefined,
  }));

  const sweep = () => {
    const now = Date.now();
    for (const item of orderConferences(items, now)) {
      const over = hasPassed(item.startMs, item.endMs, now);
      item.el.classList.toggle('is-over', over);
      const line = item.el.querySelector<HTMLElement>('.js-conf-date');
      if (line) line.textContent = over ? NO_DATES : (line.dataset.dates ?? line.textContent);
      // Re-appending in order is enough: the row is a grid, so DOM order is
      // visual order, and moving a handful of cards costs nothing.
      row.appendChild(item.el);
    }
  };

  sweep();
  // Hourly, not by the minute. Nothing here changes faster than a day, and the
  // sweep only matters at all on a page that has been open across a midnight.
  setInterval(sweep, HOUR);
}
