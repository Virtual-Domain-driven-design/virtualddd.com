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

**Design invariant.** The pipeline is only automation over a manual
process. Running `sync-notion.ts` and `git push` by hand must always
produce a correct deploy. n8n and GitHub Actions are conveniences on the
critical path, never the only path. This is what keeps the system
maintainable for a small team: if the automation breaks, publishing
degrades to a script and a commit, not an outage.

**Working style.** This is not a 1:1 port. The one fixed point is the
**branding** — the existing visual identity is preserved throughout. Beyond
that, each section is taken **as-is first, then improved in small steps**
where it makes sense, never all at once. For each section Claude works as
**both UI designer and software engineer**: analyse what the current site
and the current Notion setup actually do, propose improvements, and decide
them together through questions *before* building. Improvements can land on
either side — the Notion schema/workflow or the website — whichever removes
the real friction. Optimise where needed, not everywhere.

## Scope

In scope:

| Collection | Source | Notes |
|---|---|---|
| sessions | Notion: Virtual DDD Meetups | ~108 items; no slug, no SEO fields |
| open-spaces | Notion: Open spaces | no slug, no SEO fields |
| stories | Notion: Stories on Facilitating SA&D | already has slug + SEO fields |
| heuristics | Notion: Curated Heuristics | has slug + SEO fields; relation target only, for now |

### Schema reality (verified against Notion)

The four databases are not uniform. Two already carry slug and SEO
properties; two carry neither. The "live" status value differs per
database. Model per database, not from a single template.

| Database | Title prop | Slug | SEO fields present | "Live" status value |
|---|---|---|---|---|
| Sessions | `Name` | none — add it | none — add them | `select`: website gate is **`Done`**, not Published |
| Open spaces | `Name` | none — add it | none — add them | `status`: Published |
| Stories | `Title` | `slug` (+ `full slug` formula) | `SEO Title`, `SEO Metadescription`, `Focus keyphrase` | `status`: Published |
| Heuristics | `Title` | `Slug` | `Meta Description`, `Focus Keyphrase` | `status`: Published |

Notes:

- **Naming is already inconsistent.** Stories uses `slug` /
  `SEO Metadescription` / `Focus keyphrase`; Heuristics uses `Slug` /
  `Meta Description` / `Focus Keyphrase`. Do not add a third convention.
  Copy the Stories set when adding fields to Sessions and Open Spaces, and
  record the chosen names in `CLAUDE.md`.
- **Sessions has a `Wordpress Published date` property** left from the old
  WP sync. `Name` + that date is the join key for recovering each
  session's existing WordPress URL (see Phase 1).
- **People are modelled inconsistently.** Sessions use an `Organiser` /
  `Co-Organisers` relation to a people collection; Stories and Heuristics
  store `Authors` as a multi-select. Relevant only if speaker pages happen
  later (see After).

### Sessions lifecycle

Sessions are live online events people RSVP to, so status drives two
different website states — and the new setup can automate transitions
WordPress forced you to do by hand.

- `Published` + `Datetime` in the future → shown as an **upcoming** session
  with RSVP links.
- Once `Datetime` passes → treated as **past**, shown in the **sessions
  archive** (the archive of session pages, not the separate Videos database
  in Phase 6). The `Video` (YouTube) link is usually added back at
  `Published`, since it is the live/premiere URL that simply becomes the
  recording — so a just-held session normally already shows its video.
  "Recording coming soon" is only the fallback for the rare case where
  `Video` is still empty.
- `Done` → the finalised archive page, and the trigger for the social post.
  `Done` is mostly about adding the podcast and post-session notes; the
  YouTube URL is often unchanged, occasionally swapped for an edited cut.

Upcoming-vs-past is derived from `Datetime`, not from a manual status
change. The old `Published → Ended` flip existed only because WordPress
could not compute "this event is now in the past." In the new setup:

- **The upcoming/past split is client-side.** Every session page ships in
  the built HTML; a small script hides sessions whose `Datetime` has passed
  from the upcoming section. This stays correct as time passes with no
  rebuild. Trade-off accepted: crawlers see every session in the markup,
  which is fine — each has its own canonical page regardless.
- **`Ended` is no longer needed for the website.** Keep it, if useful, only
  as an internal "held, awaiting post-production" marker; the site ignores
  it.
- **New content still needs a rebuild.** Client-side filtering only handles
  the passage of time. Publishing a session (`→ Published`) or finalising
  one (`→ Done`) changes which pages exist, so those transitions fire
  `repository_dispatch`. `Done` additionally triggers the social post
  (via the post-deploy webhook, so social never points at an unbuilt page).
- The `Video` link is normally already in Notion before the session, so no
  post-event video fetch is needed; the manual `Done` work is the podcast
  and notes, and that editorial step is where a human belongs.

Net effect vs WordPress: publishing an upcoming session and moving it into
the archive both stop being manual website chores. The one remaining manual
step is editorial — editing the recording and adding notes — which is
exactly where a human belongs.
| ddd-crew | GitHub: ddd-crew org | 17 repos, replaces broken Git it Write |
| pages | repo | currently hardcoded in WordPress |

Out of scope: the Videos database. See Phase 6 for what happens to its
536 live URLs, which is a separate question from whether you author there.

---

## Phase 0: Repository and ground rules

Goal: a repo Claude Code can work in without guessing.

1. Create the GitHub repo. Private until cutover, then consider making it
   public: ddd-crew content is CC BY-SA anyway, and a public repo gets
   free unlimited GitHub Actions minutes.
2. `npm create astro@latest`, minimal template, TypeScript strict.
3. Register the Notion MCP server with Claude Code so it can read schemas
   directly instead of working from descriptions.
4. Write `CLAUDE.md` at the repo root by hand. This file does more for
   output quality than anything else here. It should state:
   - what the site is and who it serves
   - the collection list above, and that Videos is deliberately excluded
   - that Notion is the source of truth and markdown in `src/content/` is
     generated, never hand-edited
   - the manual-fallback invariant above
   - the brand constraint: existing identity preserved, CSS rebuilt
   - deploy target: Kualo Performance, rsync over SSH, build in CI only
   - that ddd-crew content is CC BY-SA 4.0 and attribution is mandatory
5. Verify SSH is enabled on your Kualo account. It ships with the plan but
   needs switching on via support. Do this now, not on cutover day.

Done when: `npm run build` succeeds and `CLAUDE.md` describes the project
well enough that a stranger could act on it.

---

## Phase 1: URL inventory and slug capture

Goal: know every URL that exists today, and preserve it. This phase comes
first because it decides your slugs, and a slug decision made without the
live URL list is a decision made blind.

Keeping an existing URL unchanged is strictly better than redirecting it.
A 301 passes almost all authority, but only while the rule exists and is
correct, and a redirect map over 100+ sessions plus 500+ videos is a
liability you maintain forever. So the goal is: change as few URLs as
possible, redirect the rest deliberately.

1. Crawl the live site and capture every indexed URL. Include pages,
   sessions, stories, open spaces, taxonomy/category pages, the RSS feed
   at `/feed/`, and the 536 video URLs.
2. Export the existing rules from the Redirection plugin, so redirects
   already in place are not lost.
3. Note WordPress's trailing-slash convention (it serves `/slug/`). The
   new site must match it exactly. Record the choice; it is enforced in
   Phase 6.
4. **Add the missing Notion properties now**, before modelling content.
   Only Sessions and Open Spaces need them; Stories and Heuristics already
   have slug and SEO fields (see the schema table in Scope). Match the
   Stories naming rather than inventing a new one:
   - `slug` (text). Backfill from the item's **existing WordPress slug** so
     URLs do not change; editorial thereafter. Sessions have no slug and
     nothing to derive one from, so recover it by matching `Name` +
     `Wordpress Published date` against the crawl. Open Spaces has no date
     property — match by title; the set is small.
   - `SEO Metadescription` (text). Optional; falls back to the first
     paragraph.
   - `SEO Title` (text). Optional; overrides `<title>` when the page title
     is weak for search. Falls back to the title.
   - `Social image` (files). Optional; OG/Twitter card. Falls back to the
     Featured image. Stories already carries a `Featured image squared`
     that suits square social cards — reuse that pattern.

   Keep this set small on purpose. Slug matters, `SEO Metadescription` is
   worth encouraging, the rest are optional with fallbacks so a blank field
   never produces a broken page. Do **not** add a structured-data field:
   JSON-LD is generated from properties you already hold (date, authors,
   video URL), never hand-authored. See Phase 6.

Done when: a spreadsheet or file lists every live URL, the Notion Slug
property is populated from existing URLs, and the SEO fields exist.

### Status (captured 2026-07-23)

- **SEO/slug columns added** to the live Sessions and Open Spaces Notion
  databases (`slug`, `SEO Title`, `SEO Metadescription`, matching the
  Stories naming). Stories and Heuristics already had slug + SEO fields.
- **Inputs captured** in `migration-source/` (git-ignored): the full
  WordPress WXR export and the Redirection plugin rules. Per-type slug maps
  derived to `migration-source/derived/*.csv`.
- **Counts reconcile — no orphan gap.** WP published vs Notion: sessions
  108/108, open-space 5, stories (`facilitating-archdes`) 24, heuristics
  146, videos 536 (out of scope), pages 23. Sessions have **zero** slug or
  title collisions, so title-matching is unambiguous.
- **URL bases:** `/sessions/<slug>/`, `/open-space/<slug>/`,
  `/facilitating-archdes/<slug>/` (stories), `/heuristics/<slug>/`, pages at
  top level. Astro routes must emit these exact bases.
- **35 existing redirects to preserve** (mostly old numeric
  `/sessions/<id>` → slug, plus `/learning-ddd/` → `/`). Carry into
  `.htaccess` in Phase 6; they are not in the sitemap.
- **Slug backfill is deferred to the Phase 3 sync** (decided): the script
  reads the derived map, matches by title, prints a `--dry-run` proposal for
  review, then `--write-slugs` fills Notion. It also verifies that the
  existing Stories/Heuristics Notion slugs match their WordPress slugs; any
  mismatch is a URL change needing a redirect.

---

## Phase 2: Content model

Goal: Zod schemas that mirror Notion exactly.

Prompt shape:

> Using the Notion MCP, fetch the schema for each of these data sources:
> Virtual DDD Meetups, Open spaces, Stories on Facilitating Software
> Architecture & Design, Curated Heuristics. For each, produce a table of
> property name, Notion type, whether it is required, and the proposed
> Zod type. Do not write code yet. Flag every formula, rollup and
> auto-increment property, since those cannot be written back.

Then, after reviewing the tables:

> Write `src/content.config.ts` with a collection per data source. Include
> the slug and SEO fields added in Phase 1, with the fallbacks noted there.

Decisions to make here, not later:

- **Slug source.** The `Slug` property added in Phase 1 is authoritative,
  backfilled from the existing URL. Record in `CLAUDE.md` that slugs are
  editorial and that changing one is a URL change requiring a redirect.
- **Publish gate.** Define the publish predicate **per database**, not
  globally; the status vocabularies differ. Sessions is not a single gate:
  `Published` renders an **upcoming** session and `Done` renders a **past**
  one, with the upcoming/past split derived from `Datetime` — see the
  Sessions lifecycle in Scope. For Open Spaces, Stories and Heuristics the
  gate is simply `Status = Published`. Record each predicate in `CLAUDE.md`;
  the Phase 3 count reconciliation proves you got it right. (Verified: 107
  Sessions are `Done`, all carrying a `Wordpress Published date`, matching
  the ~108 archive.)
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

## Phase 3: Notion sync

Goal: `scripts/sync-notion.ts` that turns Notion into markdown.

First job of this phase is the **slug backfill** (deferred here from Phase
1): read `migration-source/derived/*.csv`, match each Sessions/Open Spaces
row by normalised title, and — under `--dry-run` — print the proposed
`title → slug` mapping for review before `--write-slugs` writes it to
Notion. Per-database publish gates apply (Sessions = `Done`; others =
`Published`). Needs its own Notion integration token (the MCP is for the
editor, not the script).

Prompt shape:

> Write a standalone Node script that reads each Notion data source using
> `@notionhq/client`, filters to Status = Published, converts page bodies
> to markdown, and writes `src/content/<collection>/<slug>.md` with
> frontmatter matching the Zod schema. Resolve relation properties from
> page IDs to slugs using a lookup built in a first pass. Download files
> from Feature image and Social image properties into `src/assets/` rather
> than linking to Notion's signed URLs, which expire. Respect Notion's rate
> limit of about three requests per second. Support `--dry-run` and
> `--collection=<name>`.

Notes:

- Notion image URLs expire. Downloading is not optional.
- Two passes: build the ID-to-slug map first, then write files. A
  single-pass script cannot resolve forward references.
- **Embeds.** Session bodies contain YouTube embeds and Notion callouts
  that a naive markdown conversion drops silently. Convert embeds to a
  known shortcode/component and spot-check a few converted pages against
  the live site. Reconciling counts is not enough; reconcile content.
- Commit the generated markdown. It gives you content history in git,
  offline builds, and a diff showing exactly what a status change did.

Run it, then compare counts against the WordPress numbers: 108 sessions
and whatever the current open-space and story counts are. A mismatch here
is a filter bug, and it is far cheaper to find now than after cutover.

Done when: `src/content/` is populated, `astro check` passes, counts
reconcile, and embeds survive on spot-checked pages.

---

## Phase 4: ddd-crew ingestion

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

## Phase 5: Design

Goal: same brand, rebuilt section by section — as-is first, improved where
it makes sense. This phase is not a one-shot; it is a loop that repeats per
section, and it never ends abruptly. See **Working style** at the top.

First, once, establish the fixed point — the brand:

> Fetch virtualddd.com and extract the computed colour palette, font
> families, type scale and spacing rhythm. Output a `src/styles/tokens.css`
> of custom properties. Do not invent values; report anything ambiguous
> instead of guessing.

Review those tokens yourself. This is the one step where Claude Code's
judgement is weakest, because "on brand" is not inferable from CSS alone.
Divi markup is not portable — do not port it; rebuild against the tokens.

Then, for **each section** (start with the three that carry the site:
home, session index, session detail — then the rest), run this loop with
Claude acting as UI designer *and* software engineer:

1. **Analyse the current section.** What does the live page do, what does
   the Notion data behind it support, and where is the friction — for
   visitors and for the organisers maintaining it?
2. **Propose, then decide together.** Claude brings options and questions
   before building: what to keep as-is, what to improve, and whether the
   fix belongs on the website or back in Notion. Branding stays fixed;
   everything else is on the table in small steps.
3. **Build the agreed step** against the tokens, with the SEO head and
   JSON-LD (Phase 6) baked in from the start, not bolted on.
4. **Ship it as-is if that is enough.** Improvement is opt-in per section,
   not a mandate. Move to the next section, or iterate on this one later.

Done when: each section either matches the current site or has been
deliberately improved with your sign-off, at both mobile and desktop
widths. Sections can land independently — the site is never blocked on a
redesign that has not happened yet.

---

## Phase 6: SEO and AI legibility

Goal: keep the search traffic you have, and be maximally legible to search
and AI answer engines. Moving off Divi shortcode soup to semantic static
HTML is already the biggest win here; this phase makes it deliberate.

1. **Redirects and the videos decision.** Using the inventory from Phase 1,
   generate a redirect map from old path to new path for the URLs that
   genuinely changed. Then handle the 536 video URLs, which have no
   replacement. Options, in order of preference:
   - render a minimal static archive from a one-time WordPress export, so
     the URLs keep working with no ongoing authoring burden
   - 301 each to the closest session or to the YouTube channel
   - return 410 Gone, telling search engines the content is intentionally
     removed

   Do not simply let them 404. Pick one and record it in `CLAUDE.md`.
   Implement redirects in `.htaccess`, since Kualo runs LiteSpeed and will
   honour it.
2. **Trailing slash.** Set Astro's `trailingSlash` to match WordPress
   exactly (see Phase 1). A mismatch turns every URL into a redirect and
   creates duplicate-content noise.
3. **Structured data.** Generate JSON-LD from existing properties, not from
   hand-authored fields. AI surfaces lean on this to understand and cite
   content. State: `Organization` + `WebSite` on the home page,
   `Event`/`VideoObject` + `Person` performers on 108 sessions, `Article` on
   24 stories, `Person` on 10 organisers, and `DefinedTerm` in one
   `DefinedTermSet` on 151 heuristics — the set declared by
   `/heuristics/`, with the heuristic-to-heuristic graph as `relatedLink` and
   the sessions and stories that discussed it as `subjectOf`.
   **Still open:** `BreadcrumbList` on nested pages (`breadcrumbs()` exists in
   `src/lib/seo.ts` and is called by nothing), the 11 ddd-crew pages, the 5
   open spaces, and `ItemList` on the remaining index pages.
4. **Sitemap.** Add `@astrojs/sitemap`. Submit it in Phase 8.
5. **RSS.** Generate a feed with `@astrojs/rss` and redirect `/feed/` to it
   so existing subscribers are not silently dropped.
6. **AI crawler policy.** Decide, in `robots.txt`, whether to allow
   `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`. For a
   community that wants its sessions cited in AI answers, allowing them is
   usually right. Make it a choice, not a default.
7. **llms.txt and markdown.** You already hold every page as clean markdown.
   Publish an `llms.txt` index, and consider exposing the raw `.md`
   alongside each page. This is nearly free and makes the site maximally
   legible to LLMs.

Done when: every URL from the Phase 1 crawl either exists in the new site
or has a deliberate redirect or gone status; JSON-LD, sitemap, RSS and
robots policy are in place.

---

## Phase 7: Forms and search

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

## Phase 8: Deployment

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

## Phase 9: Cutover

1. Deploy to a staging subdomain on Kualo, on the real host and the real
   pipeline.
2. Run a link checker across the whole site.
3. Run Lighthouse on the three main templates.
4. Verify the redirect map by requesting old URLs against staging,
   including a sample of the 536 video URLs.
5. **Lower DNS TTL a day before cutover** so you can roll back fast. Decide
   the rollback trigger in advance (e.g. link checker failures, redirect
   misses, a traffic cliff in Search Console).
6. Confirm no content drift: if WordPress is still authoritative for
   anything, run a final Notion sync at cutover so nothing published during
   the build is lost.
7. Rewire n8n: the session workflow's final step becomes a GitHub
   `repository_dispatch` instead of the WPConnect webhook. The social
   workflow's trigger becomes the post-deploy webhook.
8. Point DNS at the new document root.
9. Submit the new sitemap in Search Console and watch coverage for a week.
10. Keep WordPress alive but read-only for a month. Then take a final
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
- **Speaker pages.** Half of this is done: Session Guests is a real database,
  54 speakers are linked to 48 sessions, they render on the session page and
  they are `Person` performers on its `Event`. What is missing is the pages —
  people search names — and the reason to wait is that the rows still hold a
  name and a slug each. Fill in roles, bios, photos and links (the reporting
  suite names the ones on upcoming sessions), then `/guests/<slug>/` becomes a
  page worth having rather than 54 thin ones. Authors are still a multi-select
  on Stories and Heuristics; unifying those is a separate job.
- The Video Tags list in Notion is polluted with imported YouTube metadata
  from an unrelated channel. Irrelevant now that Videos is out of scope,
  but worth cleaning if that database is ever revived.
