/** Shared queries over the content collections.
 *
 * These exist so the same rule is not re-derived (and re-worded) on every page:
 * what counts as "upcoming", what the sidebar shows, how prev/next is ordered.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { iso, shortDate } from './dates';

type Session = CollectionEntry<'sessions'>;
type Heuristic = CollectionEntry<'heuristics'>;

/** A teaser used by the sidebar and the "discussed in" carousels. */
export interface Teaser {
  href: string;
  title: string;
  kind?: string;
  img?: ImageMetadata;
  iso?: string;
  fallback?: string;
}

/** A session is upcoming while it is Published and its datetime is in the future.
 *
 * Note this is evaluated at *build* time. Pages render both states and let the
 * client-side sweep in BaseLayout demote a session once its start time passes,
 * so the archive stays correct without a rebuild. */
export const isUpcoming = (s: Session, at: number = Date.now()) =>
  s.data.status === 'Published' && +new Date(s.data.datetime) > at;

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

/** Resolve `curatedHeuristics` references to entries.
 *
 * A reference can dangle when a heuristic is un-published in Notion but a
 * session still points at it. The sync warns about those (see
 * `scripts/sync-notion.ts`); here we drop them with a type guard rather than a
 * `filter(Boolean)` cast, so the result is properly typed. */
export function resolveHeuristics(
  refs: { id: string }[],
  byId: Map<string, Heuristic>,
): Heuristic[] {
  return refs
    .map((r) => byId.get(r.id))
    .filter((h): h is Heuristic => h !== undefined);
}

/** Index of every heuristic by id, for `resolveHeuristics`. */
export async function heuristicsById() {
  const heuristics = await getCollection('heuristics');
  return new Map(heuristics.map((h) => [h.id, h]));
}
