/** Which pre-rendered cards a set of filters leaves showing.
 *
 * The rule lives here, apart from the DOM, for the same reason `upcoming` does:
 * it is the part worth testing, and testing it through a browser is slow and
 * says less. `CardFilter.astro` is the only caller.
 *
 * **The card contract.** Every filterable card carries:
 *   - `data-search` — everything the search box should look through, lower case
 *   - `data-<facet>` — the values for that facet, lower case, `|`-delimited
 *
 * One delimiter for every facet, because the three filters this replaced each
 * matched differently: tags by pipe-delimited token, levels by substring of a
 * space-joined list, type by equality. Substring matching is the one that bites
 * — "design" would match "design-heuristics" and "guiding-heuristics" alike.
 */

/** Values are `|`-delimited so a multi-word value stays one token. */
export const packFacet = (values: readonly string[]): string =>
  values.map((v) => v.trim().toLowerCase()).filter(Boolean).join('|');

export interface FilterState {
  /** What is typed in the search box. */
  term?: string;
  /** facet key → the single selected value, or '' for "all". */
  facets?: Record<string, string>;
}

/** A card's `data-*` attributes, as `HTMLElement.dataset` gives them. */
export type CardData = Record<string, string | undefined>;

/** True when a facet is unset, or the card carries that exact value. */
const hasValue = (packed: string | undefined, value: string): boolean =>
  !value || `|${packed ?? ''}|`.includes(`|${value.trim().toLowerCase()}|`);

export function matchesCard(data: CardData, state: FilterState): boolean {
  const term = (state.term ?? '').trim().toLowerCase();
  if (term && !(data.search ?? '').includes(term)) return false;
  for (const [facet, value] of Object.entries(state.facets ?? {})) {
    if (!hasValue(data[facet], value)) return false;
  }
  return true;
}

/** "12 sessions" / "1 session" — the sentence the result count says. */
export const countLabel = (n: number, noun: { one: string; many: string }): string =>
  `${n} ${n === 1 ? noun.one : noun.many}`;
