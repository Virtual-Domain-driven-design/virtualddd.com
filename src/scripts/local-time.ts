/** Every `<time class="js-local">` in the visitor's own timezone.
 *
 * The server renders the time in the site's timezone first, so a page without
 * JavaScript still says when a session starts; this replaces it with the
 * reader's. The `data-format` values must match what `src/lib/dates.ts`
 * writes — that is the whole contract between the two.
 */
const FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  datetime: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' },
  shortdate: { day: 'numeric', month: 'short', year: 'numeric' },
  date: { day: 'numeric', month: 'long', year: 'numeric' },
};

export function initLocalTime(): void {
  document.querySelectorAll<HTMLElement>('.js-local').forEach((el) => {
    const iso = el.dataset.iso;
    if (!iso) return;
    el.textContent = new Date(iso).toLocaleString(undefined, FORMATS[el.dataset.format ?? 'date'] ?? FORMATS.date);
  });
}
