/** What /ddd-crew/ is made of, and who decides it.
 *
 * The section has two halves that used to be two hardcoded lists in two files:
 * the repos we republish (CC BY-SA 4.0, so we may host the README) and the ones
 * we can only link to. Both now come from the 🛠️ ddd-crew database in Notion,
 * through `data/ddd-crew.json`.
 *
 * A file in `data/` rather than a collection under `src/content/`, because this
 * is not content: it is the instruction that tells `sync-ddd-crew.ts` which
 * READMEs to go and fetch. It is committed, so a build never needs Notion, and
 * `sync-notion.ts ddd-crew` rewrites it.
 */

export interface CrewTool {
  /** The `ddd-crew/<repo>` name. It is the file name and therefore the URL. */
  repo: string;
  /** The name as it reads on the card. The republished page uses the README's
   *  own H1 instead, which is the upstream author's title for their own work. */
  name: string;
  /** The upstream repository. Where a link-out card goes. */
  link: string;
  /** CC BY-SA 4.0, so the README may be republished at /ddd-crew/<repo>/.
   *  False means the card links out to GitHub and nothing is fetched. */
  republished: boolean;
  category: string;
  /** Position within the category. */
  order: number;
  /** Our sentence on why it is worth someone's time. Shown on a link-out card,
   *  where there is no README to describe itself. */
  note?: string;
}

export interface CrewConfig {
  /** The categories in the order Notion lists them, so dragging an option in
   *  the select reorders the gallery. Anything not here sorts last. */
  categories: string[];
  tools: CrewTool[];
}

export const CREW_CONFIG_FILE = 'data/ddd-crew.json';

/** Where a category sits on the page. One that Notion no longer lists sorts
 *  last rather than vanishing: the gallery is grouped with this too, so a
 *  category the config has not caught up with still shows its tools. */
export const categoryRank = (categories: string[]) => (c: string) => {
  const i = categories.indexOf(c);
  return i === -1 ? categories.length : i;
};

/** Sort tools the way the gallery reads: category order, then `order`, then name. */
export function byGallery(config: CrewConfig) {
  const rank = categoryRank(config.categories);
  return [...config.tools].sort(
    (a, b) => rank(a.category) - rank(b.category) || a.order - b.order || a.name.localeCompare(b.name),
  );
}

/** Point an upstream `master` link at the branch the repo actually has today.
 *
 * Every ddd-crew repo renamed its default branch to `main`, but the READMEs
 * still hold absolute `blob/master` links to their own resources — 23 of them
 * across seven of the pages we republish. GitHub answers those with a 302 to
 * `main`, so nothing is broken *yet*: the redirect exists only because the
 * rename was done through GitHub, and it is not a promise anyone made us.
 *
 * Only the literal `master`, and only for the repo being synced. Any other
 * branch segment could be a tag or a commit SHA, and a permalink rewritten to a
 * moving branch is a worse link than a redirected one. If a repo's default
 * branch really is `master`, `branch` says so and nothing here matches.
 */
export function retargetBranch(md: string, owner: string, repo: string, branch: string): string {
  if (branch === 'master') return md;
  const own = `${owner}/${repo}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return md
    .replace(new RegExp(`(github\\.com/${own}/(?:blob|tree|raw)/)master(?=[/#?"'\\s)])`, 'g'), `$1${branch}`)
    .replace(new RegExp(`(raw\\.githubusercontent\\.com/${own}/)master(?=[/#?"'\\s)])`, 'g'), `$1${branch}`);
}
