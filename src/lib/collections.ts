/** Shared queries over the content collections.
 *
 * These exist so the same rule is not re-derived (and re-worded) on every page:
 * what counts as "upcoming", what the sidebar shows, how prev/next is ordered.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { iso, shortDate } from './dates';
import { hasFinished } from './upcoming';
import { storyByline } from './people';

type Session = CollectionEntry<'sessions'>;

/** A teaser used by the sidebar and the "discussed in" carousels. */
export interface Teaser {
  href: string;
  title: string;
  kind?: string;
  img?: ImageMetadata;
  iso?: string;
  fallback?: string;
}

/** A session is upcoming while it is Published and has not finished yet.
 *
 * "Finished" allows a grace period after the start (see `./upcoming`), so a
 * session that is happening right now is still the one the site points at.
 *
 * Evaluated at *build* time. Pages that lead with a single upcoming session
 * render **all** of them and let the `js-next` sweep in BaseLayout pick the
 * first one still standing, so the passage of time needs no rebuild. */
export const isUpcoming = (s: Session, at: number = Date.now()) =>
  s.data.status === 'Published' && !hasFinished(+new Date(s.data.datetime), at);

export const byDateAsc = (a: Session, b: Session) =>
  +new Date(a.data.datetime) - +new Date(b.data.datetime);
export const byDateDesc = (a: Session, b: Session) =>
  +new Date(b.data.datetime) - +new Date(a.data.datetime);

/** Sessions split into upcoming (soonest first) and past (newest first). */
export async function splitSessions(at: number = Date.now()) {
  const all = await getCollection('sessions');
  return {
    all,
    upcoming: all.filter((s) => isUpcoming(s, at)).sort(byDateAsc),
    past: all.filter((s) => !isUpcoming(s, at)).sort(byDateDesc),
  };
}

/** Neighbours in an ordered list, for prev/next navigation. */
export function siblings<T extends { id: string }>(ordered: T[], id: string) {
  const i = ordered.findIndex((e) => e.id === id);
  return { prev: i > 0 ? ordered[i - 1] : undefined, next: i >= 0 ? ordered[i + 1] : undefined };
}

/** The most recent sessions as sidebar teasers, excluding the current page. */
export function sessionTeasers(sessions: Session[], excludeId?: string, n = 3): Teaser[] {
  return [...sessions]
    .filter((s) => s.id !== excludeId)
    .sort(byDateDesc)
    .slice(0, n)
    .map((s) => ({
      href: `/sessions/${s.id}/`,
      title: s.data.title,
      img: s.data.featuredImage,
      iso: iso(s.data.datetime),
      fallback: shortDate(s.data.datetime),
    }));
}

/** Sorted, lower-cased, de-duplicated tag list for a filter `<select>`. */
export function tagOptions(entries: { data: { tags?: string[] } }[]): string[] {
  const set = new Set<string>();
  for (const e of entries) for (const t of e.data.tags ?? []) set.add(t.toLowerCase());
  return [...set].sort();
}

/** Resolve references (`curatedHeuristics`, `guests`) to their entries.
 *
 * A reference can dangle when the target is un-published in Notion but the
 * entry pointing at it is not re-synced. The sync warns about those (see
 * `scripts/sync-notion.ts`); here we drop them with a type guard rather than a
 * `filter(Boolean)` cast, so the result is properly typed. */
export function resolveRefs<T>(refs: { id: string }[], byId: Map<string, T>): T[] {
  return refs
    .map((r) => byId.get(r.id))
    .filter((e): e is T => e !== undefined);
}

/** True when a session or story curates this heuristic.
 *
 * The "discussed in" relation is stored on the session and the story, so the
 * heuristic side is a scan. One definition, because it is asked twice: once to
 * render the list, once to put the same works in the heuristic's `subjectOf`. */
export const curatesHeuristic = (
  entry: { data: { curatedHeuristics?: { id: string }[] } },
  heuristicId: string,
) => (entry.data.curatedHeuristics ?? []).some((r) => r.id === heuristicId);

/** The five relations a heuristic can have to another heuristic, in the order
 *  they read best on the page. */
export const HEURISTIC_RELATIONS = [
  ['complements', 'Complements'],
  ['enables', 'Enables'],
  ['prerequisites', 'Builds on'],
  ['competesWith', 'Competes with'],
  ['specializes', 'Specialises'],
] as const;

/** Index of every heuristic by id, for `resolveRefs`. */
export async function heuristicsById() {
  const heuristics = await getCollection('heuristics');
  return new Map(heuristics.map((h) => [h.id, h]));
}

/** Index of every session guest by id, for `resolveRefs`. */
export async function guestsById() {
  const guests = await getCollection('sessionGuests');
  return new Map(guests.map((g) => [g.id, g]));
}

/** A story's credits as one flat list, for a card, the search index or a feed.
 *  `storyByline` in people.ts holds the rule; this only resolves the relation
 *  to names first, which needs the collection and so cannot live there. */
export function creditsFor(
  d: CollectionEntry<'stories'>['data'],
  guestIndex: Map<string, CollectionEntry<'sessionGuests'>>,
): string[] {
  const guests = resolveRefs(d.guests, guestIndex).map((g) => g.data.name);
  const { by, alongside } = storyByline(guests, d.hosts, d.authors);
  return [...by, ...alongside];
}

/** As `creditsFor`, for the one-off caller that has no index to hand. */
export async function storyCredits(d: CollectionEntry<'stories'>['data']): Promise<string[]> {
  return creditsFor(d, await guestsById());
}
