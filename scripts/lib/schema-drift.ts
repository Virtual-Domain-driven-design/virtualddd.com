/** Is Notion still shaped the way the sync reads it?
 *
 * Renaming or retyping a property in Notion does not fail anything. The read
 * returns nothing, every field the sync writes is optional, so the run writes
 * the record without it, commits, and deploys green. Nobody finds out until
 * somebody notices weeks later that links have gone.
 *
 * It happened four times in the first week of August 2026. Mastodon and Bluesky
 * went from URL to text while the readers still asked for a URL, and every guest
 * and organiser file was rewritten without them. The Guests database renamed
 * LinkedIn, Mastodon and Bluesky, and the readers kept asking for the old names.
 * The same rename reached five n8n flows, which posted a written-out name
 * instead of a handle for a day. Focus Keyphrase was deleted, and that one did
 * at least fail loudly, because it was a write rather than a read.
 *
 * Nothing held Notion's schema against the code, so nothing noticed. This does,
 * and it costs no extra API calls: a page property arrives carrying its own
 * `type`, so the reader that asked for it already holds both halves of the
 * comparison.
 *
 * It detects rather than prevents. The rule stands — change the code first,
 * then the Notion property. This is the net for the time somebody forgets.
 */

/** The Notion property type a reader expects. */
export type Reader =
  | 'rich_text' | 'url' | 'multi_select' | 'select' | 'date' | 'number'
  | 'files' | 'relation' | 'checkbox';

export interface Drift {
  name: string;
  expected: Reader;
  /** What Notion says it is now. Absent when no row carried the property at
   *  all, which is a rename or a deletion rather than a retype. */
  actual?: string;
}

interface PropWatch { expected: Reader; seen: number; missing: number; actual: Set<string> }

/** Remembers which properties a run asked for, and what came back.
 *
 * Derived rather than declared. A hand-written list of the properties the sync
 * expects would be a second thing to keep in step with the readers, and two
 * things drifting apart is the entire failure being guarded against. Every
 * typed reader goes through one function, so that function is the inventory.
 */
export function schemaWatch() {
  const props = new Map<string, PropWatch>();
  return {
    /** One read. `actual` is the property object Notion returned, or undefined
     *  when the page carried nothing under that name. */
    note(name: string, expected: Reader, actual: unknown) {
      let p = props.get(name);
      if (!p) props.set(name, (p = { expected, seen: 0, missing: 0, actual: new Set() }));
      p.seen += 1;
      const type = (actual as { type?: unknown } | null | undefined)?.type;
      if (actual === undefined || actual === null) p.missing += 1;
      else if (typeof type === 'string') p.actual.add(type);
    },
    drift(): Drift[] {
      const out: Drift[] = [];
      for (const [name, p] of props) {
        // Only when *no* row had it. One page without a value is normal; a
        // database where nothing has it is a name the code is alone in still
        // believing.
        //
        // Except a checkbox, which Notion does not send at all when it has
        // never been ticked, so absence says nothing about the schema. Without
        // this, `Retire URL` on a database where nobody has retired anything
        // would be reported on every run for ever.
        if (p.missing === p.seen && p.expected !== 'checkbox') {
          out.push({ name, expected: p.expected });
          continue;
        }
        // One disagreeing type across every row that has the property. A schema
        // change cannot produce a mix, so more than one type is something else
        // and is left alone rather than guessed at.
        if (p.actual.size === 1) {
          const [actual] = p.actual;
          if (actual !== p.expected) out.push({ name, expected: p.expected, actual });
        }
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

/** The same finding for whoever is watching the run.
 *
 * Both sync paths report this identically, so the wording lives here rather
 * than in two console blocks that would drift apart the first time one of them
 * was improved.
 */
export function driftLines(drift: Drift[]): string[] {
  if (!drift.length) return [];
  return [
    `\n  ! ${drift.length} propert${drift.length === 1 ? 'y' : 'ies'} this sync reads ${drift.length === 1 ? 'is' : 'are'} not shaped the way it expects:`,
    ...drift.map((d) => (d.actual
      ? `      ${d.name}: read as ${d.expected}, Notion says ${d.actual}`
      : `      ${d.name}: read by the sync, not in the database`)),
    '    Generated content is already missing these fields. Fix the reader, then re-sync.',
  ];
}

/** Drift as something a person can act on.
 *
 * `url` is a row from the database rather than the database itself, because a
 * data source id is not an address anybody can open, and a row shows the
 * property panel where the rename happened.
 */
export function driftAlerts(section: string, sampleUrl: string, drift: Drift[]) {
  return drift.map((d) => ({
    kind: 'notion-schema-drift' as const,
    section,
    title: d.actual
      ? `${d.name} is read as ${d.expected}, but Notion now says ${d.actual}`
      : `${d.name} is read by the sync, but the database has no such property`,
    url: sampleUrl,
  }));
}
