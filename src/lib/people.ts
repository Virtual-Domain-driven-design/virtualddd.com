/** Matching people across collections.
 *
 * People are modelled inconsistently in Notion (see MIGRATION.md): Sessions use
 * an `Organiser` relation to the people database, while Stories and Heuristics
 * store `Authors` as free-text multi-select. So the same person appears as
 * "Kenny Baas-Schwegler" on a session and "Kenny Schwegler" on a story.
 *
 * Until that is unified, match on names rather than pretending they are ids.
 */

const tokens = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // "Kenny (Baas) Schwegler" → "Kenny Schwegler"
    .replace(/[^a-zÀ-ɏ\s-]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** True when two written names plausibly denote the same person. */
export function samePerson(a: string, b: string): boolean {
  const x = tokens(a), y = tokens(b);
  if (!x.length || !y.length) return false;
  if (x.join(' ') === y.join(' ')) return true;
  // Same first name, and one surname contains the other:
  // "Kenny Schwegler" ↔ "Kenny Baas-Schwegler".
  if (x[0] !== y[0]) return false;
  const sx = x[x.length - 1], sy = y[y.length - 1];
  return sx.includes(sy) || sy.includes(sx);
}

/** True when any name in the list denotes this person. */
export const anySamePerson = (names: string[] | undefined, person: string) =>
  (names ?? []).some((n) => samePerson(n, person));
