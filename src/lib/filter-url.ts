/** Matching a query-string filter value against the options on the page.
 *
 * The site once published a page per tag (`/sessions_tag/eventstorming/`).
 * Those addresses 301 here as `/sessions/?tag=eventstorming`, so the visitor
 * has to land on the filtered view, not a generic index.
 *
 * An unknown value deliberately matches nothing: three retired slugs
 * (`ux-ui-design`, `cqrs-es`, `business-it-alignment`) no longer exist as tags,
 * and showing the whole archive beats an empty results page.
 */

/** The slug form those addresses used: lower case, non-alphanumerics to hyphens.
 *  Module-private: `slugMatches` is the only caller, and an export with one
 *  in-file caller is API surface nobody asked for.
 *  Tags are stored as prose ("Collaborative Modeling"), so both sides of the
 *  comparison have to be slugified for `?tag=collaborative-modeling` to hit. */
const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** True when an option on the page is the one the query string asked for. */
export const slugMatches = (option: string, wanted: string): boolean =>
  !!option && !!wanted && slugify(option) === slugify(wanted);
