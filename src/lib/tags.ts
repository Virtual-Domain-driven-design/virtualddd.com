/** One spelling per tag.
 *
 * Tags were typed by different people over five years and drifted into 386
 * spellings of maybe 240 ideas: `EventStorming`/`eventstorming`,
 * `Psychological Safety`/`psychological-safety`/`psychological safety`,
 * `Strategic design` and `strategic design` with 21 uses each in different
 * databases, plus `architecte decisions` and `event sroucing`. A tag spelled
 * two ways is two tags: the archive filter lists both, each finds half the
 * pages, and neither looks wrong enough to report.
 *
 * **This runs in the sync, not in Notion**, and that is not a preference.
 * Notion's multi-select option names are case-insensitively unique, so the API
 * silently ignores a rename that only changes case, and writing `eventstorming`
 * onto a page re-uses the existing `EventStorming` option instead of creating
 * one. Options can only be removed by sending the whole list back minus the
 * ones to drop, and that request is capped at 100 options — heuristics has 362.
 * Every route to fixing case *in* Notion is closed.
 *
 * Doing it here is better anyway: it is one rule in one place, it applies to a
 * tag typed tomorrow as well as the ones typed in 2020, and it is testable.
 * Notion stays the source of truth for *which* tags a page has; this decides
 * how they are spelled.
 *
 * Nothing here merges synonyms, reconciles singular with plural, or drops a tag
 * used once. Those need a person who knows the content.
 */

/** Compounds English hyphenates.
 *
 * Applied *after* every hyphen is flattened to a space, so `decision-making`
 * and `Decision Making` land on one spelling rather than two. Protecting the
 * hyphens that were already there would have kept both. */
const HYPHENATE: [RegExp, string][] = [
  [/\b(behaviour|domain|event|test|data|value|consumer|team|user|offline) driven\b/g, '$1-driven'],
  [/\bdecision making\b/g, 'decision-making'],
  [/\banti corruption\b/g, 'anti-corruption'],
  [/\bhands on\b/g, 'hands-on'],
  [/\bivory tower\b/g, 'ivory-tower'],
  [/\bteam led\b/g, 'team-led'],
  [/\btrade off(s?)\b/g, 'trade-off$1'],
  [/\bone on one\b/g, 'one-on-one'],
  [/\bself (awareness|regulation)\b/g, 'self-$1'],
  [/\bsense making\b/g, 'sense-making'],
  [/\bsocio technical\b/g, 'socio-technical'],
  [/\binside out\b/g, 'inside-out'],
  [/\blarge scale\b/g, 'large-scale'],
  [/\bcross functional\b/g, 'cross-functional'],
];

/** British spelling, and the typos worth spelling out rather than leaving in. */
const SPELLING: [RegExp, string][] = [
  [/\barchitecte\b/g, 'architect'],
  [/\bsroucing\b/g, 'sourcing'],
  [/\bwalktrough\b/g, 'walkthrough'],
  [/\bmodeling\b/g, 'modelling'],
  [/\bmodeler\b/g, 'modeller'],
  [/\bbehavioral\b/g, 'behavioural'],
  [/\borganizational\b/g, 'organisational'],
  // The plural matters: `\bization\b` cannot see `organizations`, because the
  // trailing s is a word character and there is no boundary to match. That
  // left exactly one tag — "teams and organizations" — American.
  [/\borganization(s?)\b/g, 'organisation$1'],
  [/ization(s?)\b/g, 'isation$1'],
  [/izing\b/g, 'ising'],
  [/\bcentralized\b/g, 'centralised'],
  // Not a spelling of anything else, but plainly meant to be.
  [/\bcollaborate modelling\b/g, 'collaborative modelling'],
];

/** The one spelling of a tag.
 *
 * Lower case, because the site already works that way: `tagOptions` lower cases
 * every tag for the filter on every archive, and `.chip--outline` is the
 * "bordered and lower-case" treatment for a content tag. Storing `EventStorming`
 * never put a capital E in front of a visitor except on a heuristic's own chips.
 */
export function normaliseTag(tag: string): string {
  let s = tag.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, to] of SPELLING) s = s.replace(re, to);
  for (const [re, to] of HYPHENATE) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').trim();
}

/** A page's tags, spelled one way and each appearing once.
 *
 * The de-duplication is the point of doing this per page rather than per tag:
 * a session carrying both `Collaborative Modeling` and `collaborative modelling`
 * has one tag, and would otherwise render the same chip twice. */
export const normaliseTags = (tags: readonly string[]): string[] =>
  [...new Set(tags.map(normaliseTag).filter(Boolean))];
