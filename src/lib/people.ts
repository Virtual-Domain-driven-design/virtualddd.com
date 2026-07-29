/** Matching people across collections.
 *
 * People are modelled two ways in Notion (see docs/content-model.md): Sessions
 * use an
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

/** Which guests a card should name, and how many it leaves unsaid.
 *
 * Session titles routinely end in "… with Nick Tune", so naming the guests
 * again would read as a stutter — on 53 of the 67 sessions that have guests,
 * the title already carries every name. A guest counts as *already named* only
 * when both their first name and their surname appear: "a conversation with
 * Rebecca" does not introduce Rebecca Wirfs-Brock, it half-introduces her, and
 * the card is the place to finish the job.
 *
 * Capped because a panel can have seven guests and a card is a small box; the
 * remainder is returned rather than dropped so the card can say how many are
 * missing instead of implying it listed everybody.
 */
export function guestsToName(
  title: string,
  names: string[],
  cap = 2,
): { shown: string[]; extra: number } {
  const inTitle = tokens(title);
  const worth = names.filter((n) => {
    const t = tokens(n);
    if (!t.length) return false;
    const first = t[0], last = t[t.length - 1];
    const has = (w: string) => inTitle.some((x) => x === w || x.includes(w) || w.includes(x));
    return !(has(first) && has(last));
  });
  return { shown: worth.slice(0, cap), extra: Math.max(0, worth.length - cap) };
}

/**
 * Who a story is credited to, and in what role.
 *
 * One rule in one place, because it has three readers that would otherwise
 * each keep a copy: the byline under the title, the credit beside it in the
 * sidebar, and the flat list on every card, in the search index and in the
 * `.md` view. It lives here rather than in `collections.ts` so it can be
 * tested — that module imports `astro:content` at runtime and cannot be loaded
 * outside a build.
 *
 * The guest told the story and the hosts asked the questions, so they are not
 * interchangeable and a single list would say neither. An episode with no
 * outside guest is the hosts talking to each other, so it is simply by them.
 *
 * A story with neither is credited to nobody, and that is deliberate: it was
 * the `Authors` multi-select that stood in here, and it is gone from Notion as
 * of 2026-07-29. `tests/content/quality.test.mjs` fails the build if a
 * published story has no author in its structured data, so an uncurated one is
 * caught before it ships rather than quietly credited to no one.
 */
export function storyByline(
  guests: string[],
  hosts: string[],
): { by: string[]; alongside: string[] } {
  if (guests.length) return { by: guests, alongside: hosts };
  return { by: hosts, alongside: [] };
}
