/** Matching people across collections.
 *
 * People are modelled two ways in Notion (see AGENTS.md): Sessions use an
 * `Organiser` relation to the people database, while Stories and Heuristics
 * store `Authors` as a free-text multi-select. So the same person appears as
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

/** The profiles a person may have off this site. */
interface Profiles {
  website?: string;
  linkedin?: string;
  mastodon?: string;
  bluesky?: string;
}

/** A person's outbound links, labelled and in one fixed order.
 *
 * One list, because these links are rendered on the page *and* become `sameAs`
 * in the structured data — if they were built twice the two could disagree
 * about what a person's profiles are. */
export const profileLinks = (p: Profiles): { label: string; href: string }[] =>
  ([
    ['Website', p.website],
    ['LinkedIn', p.linkedin],
    ['Mastodon', p.mastodon],
    ['Bluesky', p.bluesky],
  ] as const)
    .filter(([, href]) => !!href)
    .map(([label, href]) => ({ label, href: href as string }));
