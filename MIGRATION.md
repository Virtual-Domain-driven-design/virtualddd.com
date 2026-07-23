# virtualddd.com: WordPress to Astro

Migration plan, written to be executed phase by phase with Claude Code.
Run one phase per session with a fresh context. Use plan mode before any
phase that writes code.

## Target architecture

```
Notion (Sessions, Open Spaces, Stories, Heuristics)
   |
n8n session workflow: YouTube + Meet + write back to Notion
   |
   +--> repository_dispatch --> GitHub Actions
                                   |  sync Notion -> markdown
                                   |  sync ddd-crew repos
                                   |  commit
                                   |  astro build
                                   |  rsync over SSH to Kualo
                                   +--> webhook --> n8n social posts
```

WordPress, WPConnect, Divi, ACF, Yoast, LiteSpeed, Wordfence and the rest
are decommissioned. n8n keeps its session workflow and its social workflow,
and gains a form endpoint.

## Scope

In scope:

| Collection | Source | Notes |
|---|---|---|
| sessions | Notion: Virtual DDD Meetups | ~108 items |
| open-spaces | Notion: Open spaces | |
| stories | Notion: Stories on Facilitating SA&D | |
| heuristics | Notion: Curated Heuristics | relation target only, for now |
| ddd-crew | GitHub: ddd-crew org | 17 repos, replaces broken Git it Write |
| pages | repo | currently hardcoded in WordPress |

Out of scope: the Videos database. See Phase 5 for what happens to its
536 live URLs, which is a separate question from whether you author there.

---

## Phase 0: Repository and ground rules

Goal: a repo Claude Code can work in without guessing.

1. Create the GitHub repo. Private until cutover.
2. `npm create astro@latest`, minimal template, TypeScript strict.
3. Register the Notion MCP server with Claude Code so it can read schemas
   directly instead of working from descriptions.
4. Write `CLAUDE.md` at the repo root by hand. This file does more for
   output quality than anything else here. It should state:
   - what the site is and who it serves
   - the collection list above, and that Videos is deliberately excluded
   - that Notion is the source of truth and markdown in `src/content/` is
     generated, never hand-edited
   - the brand constraint: existing identity preserved, CSS rebuilt
   - deploy target: Kualo Performance, rsync over SSH, build in CI only
   - that ddd-crew content is CC BY-SA 4.0 and attribution is mandatory
5. Verify SSH is enabled on your Kualo account. It ships with the plan but
   needs switching on via support. Do this now, not on cutover day.

Done when: `npm run build` succeeds and `CLAUDE.md` describes the project
well enough that a stranger could act on it.

---

## Phase 1: Content model

Goal: Zod schemas that mirror Notion exactly.

Prompt shape:

> Using the Notion MCP, fetch the schema for each of these data sources:
> Virtual DDD Meetups, Open spaces, Stories on Facilitating Software
> Architecture & Design, Curated Heuristics. For each, produce a table of
> property name, Notion type, whether it is required, and the proposed
> Zod type. Do not write code yet. Flag every formula, rollup and
> auto-increment property, since those cannot be written back.

Then, after reviewing the tables:

> Write `src/content.config.ts` with a collection per data source.

Decisions to make here, not later:

- **Slug source.** Heuristics carry both `Slug` and a `Full slug` formula.
  Pick one and record the choice in `CLAUDE.md`. Sessions and Stories may
  not have a slug property at all, in which case decide between deriving
  from title and adding the property in Notion. Adding it in Notion is
  better, because it makes the slug editorial rather than incidental.
- **Publish gate.** Only `Status = Published` rows produce files. This is
  the one-line replacement for what WPConnect was doing.
- **Relations.** Notion stores page IDs; Astro needs slugs. Model these as
  `reference()` and let the build fail on a dangling link. This is the part
  a naive migration breaks silently.
- **Heuristics.** Currently only reached from Sessions and Stories, so they
  render as a component on those pages rather than as a section. Give them
  slugs anyway. Turning that into a browsable index later is then a routing
  change, not a re-migration.

Done when: schemas exist and `astro check` passes against an empty content
directory.

---

## Phase 2: Notion sync

Goal: `scripts/sync-notion.ts` that turns Notion into markdown.

Prompt shape:

> Write a standalone Node script that reads each Notion data source using
> `@notionhq/client`, filters to Status = Published, converts page bodies
> to markdown, and writes `src/content/<collection>/<slug>.md` with
> frontmatter matching the Zod schema. Resolve relation properties from
> page IDs to slugs using a lookup built in a first pass. Download files
> from Feature image properties into `src/assets/` rather than linking to
> Notion's signed URLs, which expire. Respect Notion's rate limit of about
> three requests per second. Support `--dry-run` and `--collection=<name>`.

Notes:

- Notion image URLs expire. Downloading is not optional.
- Two passes: build the ID-to-slug map first, then write files. A
  single-pass script cannot resolve forward references.
- Commit the generated markdown. It gives you content history in git,
  offline builds, and a diff showing exactly what a status change did.

Run it, then compare counts against the WordPress numbers: 108 sessions
and whatever the current open-space and story counts are. A mismatch here
is a filter bug, and it is far cheaper to find now than after cutover.

Done when: `src/content/` is populated, `astro check` passes, and counts
reconcile.

---

## Phase 3: ddd-crew ingestion

Goal: the community content that Git it Write was supposed to deliver.

The org has 17 repositories, mostly licensed CC BY-SA 4.0, at least one
CC0. Note also that `ddd-crew.github.io` already publishes these.

Two decisions before writing anything:

1. **Licensing.** BY-SA is share-alike. Republishing means attributing each
   repo and its contributors, linking the licence, and accepting that your
   rendered pages inherit BY-SA. That is fine, but it should be a choice
   rather than a discovery. Put the attribution block in the layout, not in
   each page.
2. **Duplicate content.** Since ddd-crew.github.io already exists, set
   `rel=canonical` on your rendered pages pointing at the upstream
   repository or the existing published version. Otherwise you are
   competing with the community's own site in search results.

Prompt shape:

> Write `scripts/sync-ddd-crew.ts` that enumerates public repositories in
> the ddd-crew GitHub org, fetches the default branch README and any
> markdown under `/docs`, rewrites relative image and link paths to
> absolute raw.githubusercontent URLs or downloads them locally, and writes
> them into `src/content/ddd-crew/<repo>/`. Capture repo description, star
> count, licence and last commit date into frontmatter. Skip repos with a
> `.no-publish` marker.

Consider pinning to release tags rather than tracking the default branch,
so an upstream edit cannot change your site without a commit.

Done when: repos render as pages, images resolve, attribution is present
on every page, canonicals are set.

---

## Phase 4: Design

Goal: same brand, better CSS.

1. Extract tokens from the live site before touching anything:

   > Fetch virtualddd.com and extract the computed colour palette,
   > font families, type scale and spacing rhythm. Output a
   > `src/styles/tokens.css` of custom properties. Do not invent values;
   > report anything ambiguous instead of guessing.

2. Review those tokens yourself. This is the one step where Claude Code's
   judgement is weakest, because "on brand" is not inferable from CSS
   alone.
3. Build three layouts first: list, detail, home. Get them right, then the
   rest follows quickly.
4. Divi markup is not portable. Do not attempt to port it. Rebuild against
   the tokens.

Done when: a session detail page and a session index look like the current
site to you, at both mobile and desktop widths.

---

## Phase 5: URLs and redirects

Goal: no lost search traffic. This is where sites quietly die.

1. Crawl the live site and capture every indexed URL.
2. Export the existing rules from the Redirection plugin.
3. Generate a redirect map from old path to new path.
4. **The videos decision.** 536 published video URLs exist today and have
   no replacement. Options, in order of preference:
   - render a minimal static archive from a one-time WordPress export, so
     the URLs keep working with no ongoing authoring burden
   - 301 each to the closest session or to the YouTube channel
   - return 410 Gone, telling search engines the content is intentionally
     removed

   Do not simply let them 404. Pick one and record it in `CLAUDE.md`.
5. Implement redirects in `.htaccess`, since Kualo runs LiteSpeed and will
   honour it.

Done when: every URL from the crawl either exists in the new site or has a
deliberate redirect or gone status.

---

## Phase 6: Forms and search

- **Search:** Pagefind. Indexes at build, no backend, works on static
  hosting.
- **Forms:** a plain HTML form posting to an n8n webhook that writes to
  Notion. This replaces both Contact Form 7 and the CF7-to-Notion add-on.
- **Spam:** Akismet goes away with WordPress, and this is the one thing
  that gets worse rather than better in this migration. Add a honeypot
  field and a submission-timestamp check in the form, plus rate limiting
  and a Notion-side dedupe in the workflow. Do not leave this to cutover
  day.

---

## Phase 7: Deployment

Goal: push to main, site updates.

Prompt shape:

> Write a GitHub Actions workflow that builds the Astro site and deploys
> `dist/` to Kualo over SSH. Use the release-symlink pattern: rsync to
> `~/releases/<sha>`, then repoint `public_html` at it. If a symlinked
> document root is rejected by the host, fall back to
> `rsync --delete --delay-updates` directly into `public_html`. Trigger on
> push to main and on `repository_dispatch` with type `content-updated`.
> Add a final step that POSTs to an n8n webhook URL held in secrets.

Build in CI, never on Kualo. The Node selector there is real but you do
not want your build depending on a shared host's toolchain.

Test the symlink approach early. Shared hosts with strict account
isolation sometimes reject symlinked document roots, and you want to know
that before cutover, not during.

---

## Phase 8: Cutover

1. Deploy to a staging subdomain on Kualo, on the real host and the real
   pipeline.
2. Run a link checker across the whole site.
3. Run Lighthouse on the three main templates.
4. Verify the redirect map by requesting old URLs against staging.
5. Rewire n8n: the session workflow's final step becomes a GitHub
   `repository_dispatch` instead of the WPConnect webhook. The social
   workflow's trigger becomes the post-deploy webhook.
6. Point DNS at the new document root.
7. Submit the new sitemap in Search Console and watch coverage for a week.
8. Keep WordPress alive but read-only for a month. Then take a final
   database and uploads backup, cancel the extras, and delete it.

---

## After

- Revisit the Kualo plan tier. Performance is sized for a PHP application
  you will no longer be running. Check what else is on the account first,
  email especially.
- Decide whether heuristics deserve their own browsable index. The data
  already supports it: five self-relations plus cross-links to sessions
  and stories. That graph is something WordPress was never going to render
  well, and it is the strongest argument for having done any of this.
- The Video Tags list in Notion is polluted with imported YouTube metadata
  from an unrelated channel. Irrelevant now that Videos is out of scope,
  but worth cleaning if that database is ever revived.
