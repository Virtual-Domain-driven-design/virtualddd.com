/** Date formatting, in one place.
 *
 * Every date on the site is rendered twice: this server-side string is the
 * no-JS fallback, and `BaseLayout`'s `.js-local` script replaces it with the
 * visitor's local time. The `data-format` attribute there must match the
 * helper used here — see `LOCAL_FORMATS` below for the mapping.
 */

type DateLike = Date | string | number;

const d = (value: DateLike) => (value instanceof Date ? value : new Date(value));

/** ISO string for `datetime`/`data-iso` attributes. */
export const iso = (value: DateLike) => d(value).toISOString();

/** `5 Aug 2026` — cards, sidebars, listings. `data-format="shortdate"` */
export const shortDate = (value: DateLike) =>
  d(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** `5 August 2026` — detail-page datelines. `data-format="date"` */
export const longDate = (value: DateLike) =>
  d(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** `21–25 Sep 2026` — a multi-day run, with the parts both ends share said once.
 *
 * No `.js-local` twin, unlike every helper above: a conference runs for whole
 * days in its own city, so there is no instant to convert and re-rendering
 * "21–25 Sep" in the reader's timezone could only ever make it wrong.
 */
export function dateRange(start: DateLike, end?: DateLike): string {
  const a = d(start);
  if (!end) return shortDate(a);
  const b = d(end);
  if (a.getTime() === b.getTime()) return shortDate(a);

  const day = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric' });
  const dayMonth = (x: Date) => x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${shortDate(a)} – ${shortDate(b)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) return `${dayMonth(a)} – ${shortDate(b)}`;
  return `${day(a)}–${day(b)} ${b.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`;
}

/** `Wednesday, 5 August 2026, 08:00 GMT+2` — the featured/next session. `data-format="datetime"` */
export const longDateTime = (value: DateLike) =>
  d(value).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
