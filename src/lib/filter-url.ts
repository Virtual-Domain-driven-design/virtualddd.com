/** Pre-select a filter from the query string, client-side.
 *
 * The site once published a page per tag (`/sessions_tag/eventstorming/`).
 * Those addresses 301 here as `/sessions/?tag=eventstorming`, so the visitor
 * has to land on the filtered view, not a generic index.
 *
 * An unknown tag deliberately applies nothing: three legacy slugs
 * (`ux-ui-design`, `cqrs-es`, `business-it-alignment`) no longer exist as
 * tags, and showing the whole archive beats an empty results page.
 */
/** The slug form those addresses used: lower case, non-alphanumerics to hyphens.
 *  Tags are stored as prose ("Collaborative Modeling"), so both sides of the
 *  comparison have to be slugified for `?tag=collaborative-modeling` to hit. */
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function applyUrlFilter(select: HTMLSelectElement, param = 'tag'): string {
  const want = new URLSearchParams(location.search).get(param);
  if (!want) return '';
  const target = slugify(want);
  const match = [...select.options].find((o) => o.value && slugify(o.value) === target);
  if (!match) return '';
  select.value = match.value;
  return match.value;
}
