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

/** `Wednesday, 5 August 2026, 08:00 GMT+2` — the featured/next session. `data-format="datetime"` */
export const longDateTime = (value: DateLike) =>
  d(value).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
