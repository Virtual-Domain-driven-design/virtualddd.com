# CLAUDE.md — virtualddd.com

Operating brief for Claude Code. Read this before acting. The phase-by-phase
plan lives in `MIGRATION.md`; this file is the standing context that plan
assumes.

## What this is

virtualddd.com is the site of **Virtual DDD**, a small, volunteer-run online
community around Domain-Driven Design, software architecture and design. It
publishes live online **sessions** (meetups people RSVP to, then watch back),
**open spaces**, **stories** on facilitating software architecture & design,
curated **heuristics**, and republished **ddd-crew** community content.

It is being migrated from WordPress to a **static Astro site** sourced from
**Notion**, built in CI, and deployed to **Kualo** over SSH. Small team, little
time: the whole point is less ongoing maintenance than WordPress demanded.

## How we work (read this — it shapes every change)

- **Not a 1:1 port.** The one fixed point is the **branding** — the existing
  visual identity is preserved throughout. Everything else may be improved.
- **Section by section, as-is first, then improve in small steps** where it
  makes sense. Improvement is opt-in per section, never a big-bang rebuild.
  Sections ship independently.
- For each section, act as **UI designer *and* software engineer**: analyse
  what the live site and the Notion data/workflow actually do, surface the
  friction, then **propose options and ask before building**. Recommend, but
  let the maintainers decide.
- **Improvements can land on either side** — the Notion schema/workflow or the
  website — whichever removes the real friction. Improving Notion is in scope,
  not just rendering what's there.

## Content model

**Notion is the source of truth.** Markdown under `src/content/` is
**generated** by the sync scripts and **never hand-edited**. Commit the
generated markdown (content history in git, offline builds, reviewable diffs).

Collections and their Notion data sources (verified schemas):

| Collection | Notion data source (`collection://…`) | Slug | SEO fields |
|---|---|---|---|
| sessions | `33e9db0a-1418-4a3e-a053-33fa384e5e93` | none — add it | none — add them |
| open-spaces | `0cfb73c7-a638-4948-a4df-5fe06dcd2dd1` | none — add it | none — add them |
| stories | `25aa485a-fafc-8047-94b7-000b3bbb228c` | `slug` (+ `full slug` formula) | `SEO Title`, `SEO Metadescription`, `Focus keyphrase` |
| heuristics | `e7743290-3850-404e-ae98-23a4caf0488e` | `Slug` | `Meta Description`, `Focus Keyphrase` |

People relation target (Sessions `Organiser`/`Co-Organisers`):
`collection://cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6`.

**Videos are out of scope.** The Notion Videos database and its ~536 live URLs
are not authored here; they get a redirect/archive decision in `MIGRATION.md`
Phase 6, not a collection.

### Publish gates (per database — not global)

- **Sessions** render in two states, derived from `Datetime`, not a manual
  flip: `Status = Published` + future `Datetime` → **upcoming** (RSVP);
  `Status = Done` → **past archive** (with recording/notes). The
  upcoming→past transition is **client-side** by date; no rebuild needed for
  the passage of time. `Ended` is an optional internal "awaiting
  post-production" marker the website ignores. The `Video` (YouTube) link is
  usually present from `Published` on.
- **Open spaces / stories / heuristics**: `Status = Published`.
- Only rows passing their gate produce files. Reconcile counts after syncing
  (Sessions archive ≈ 108; verified 107 are `Done`).

### Slugs and URLs (SEO is a hard requirement)

- Existing URLs must stay reachable. **Preserve, don't just redirect.** The
  `slug` property is authoritative and is **backfilled from the existing
  WordPress URL** (match Sessions by `Name` + `Wordpress Published date`
  against the live sitemap). Slugs are editorial thereafter; changing one is a
  URL change needing a redirect.
- `trailingSlash: 'always'` in `astro.config.mjs` matches WordPress; do not
  change it without a redirect plan.
- When adding SEO fields to Sessions/Open Spaces, **reuse the Stories naming**
  (`slug`, `SEO Title`, `SEO Metadescription`) — do not invent a third
  convention. Structured data (JSON-LD) is **generated** from existing
  properties, never hand-authored in Notion.
- Relations: model as Astro `reference()` and let the build fail on a dangling
  link rather than dropping it silently.

## Brand

Existing visual identity is preserved; the CSS is rebuilt against tokens
extracted from the live site (`src/styles/tokens.css`). Divi markup is not
portable — do not port it, rebuild against tokens.

## Design rules

Three rules that were previously implicit and had drifted. Anything not covered
here is open — the brand is the fixed point, not the layout.

- **Card colour.** Dark cards (`.card`) are the default, everywhere. White
  (`.card--heuristic`) means *this is a heuristic* — an index card you could
  pull out of a box — and is used wherever a heuristic appears, including
  inside session and story pages. No other content type uses a white card.
- **Text on photographs.** Never rely on a text-shadow alone. Anything set over
  a photographic or painted background gets `.scrim` (or its own plate, as on
  the About hero). The Kandinsky-style tiles are bright and busy; small copy
  over them without an overlay is unreadable.
- **One primary action per view.** The upcoming-session hero offers RSVP, with
  everything else demoted. Join/livestream links are marked `.js-live` and only
  appear from two hours before the start — before that they are noise, and the
  page still shows them if JavaScript is off.

## Code conventions

Shared before local. A pattern used by more than one section lives in the
shared layer, never copied into a second page — that copying is what made
"restyle the cards" a sixteen-file edit before.

- **`src/styles/patterns.css`** — the shared UI vocabulary, loaded once by
  `BaseLayout`: `.card` (+ `--feature`, `--upcoming`, `--heuristic`),
  `.grid-cards`, `.eyebrow`, `.section-head`, `.detail` / `-head` / `-body` /
  `-side`, `.prose-body`, `.prose-muted`, `.prevnext`, `.filters`,
  `.carousel`, `.solo`, `.panel-cyan`, `.scrim`. Add variants **here**, not in
  a page's `<style>`.
  **Astro does not extend a page's style scope into a child component**, so a
  `.card` override written in a page's scoped `<style>` silently never
  matches. Variants must be global.
- **`src/lib/`** — `dates` (every date format; the `data-format` values must
  match `BaseLayout`'s local-time script), `embeds` (`youtubeEmbed`),
  `excerpt`, `collections` (session split, teasers, siblings, tag options,
  relation resolution), `heuristics` (the three types — one definition).
- **`src/components/`** — `TeaserCard` is *the* card; `SessionCard`/`StoryCard`
  are thin wrappers over it. `Carousel`, `PrevNext`, `HeuristicCard`,
  `HeuristicDetail`, `HeuristicTypePage`.
- Page `<style>` blocks are for what is genuinely local to that page only.
- Progressive enhancement is a rule, not a preference: every `<time>` ships a
  server-rendered fallback, filters only hide pre-rendered cards, no page
  depends on JS to show its content.
- `astro check` must stay at **0 errors, 0 warnings, 0 hints**.

## ddd-crew content

Mostly CC BY-SA 4.0 (share-alike). Attribution to each repo and its
contributors is **mandatory**, in the layout not per page, with a link to the
licence. Set `rel=canonical` to the upstream repo / existing published version,
since `ddd-crew.github.io` already publishes these.

## Deploy

- Build in **CI only**, never on Kualo. Deploy `dist/` to Kualo over SSH.
- The pipeline (Notion → n8n → GitHub Actions → rsync; social via post-deploy
  webhook) is **automation over a manual process**. Running the sync script and
  `git push` by hand must always produce a correct deploy. If the automation
  breaks, publishing degrades to a script and a commit — never an outage.

## Commands

- `npm run dev` — local dev server
- `npm run build` — static build to `dist/`, then `scripts/prune-dist.mjs`
  drops the unreferenced originals Astro emits alongside its `.webp`
  (~22 MB of a 46 MB build)
- `npm run preview` — serve the built site
- `npm run sync` — the whole content pipeline: Notion (all four collections +
  organisers) then the ddd-crew repos. This is the "script and a commit"
  fallback the deploy invariant depends on; per-collection scripts
  (`sync:sessions`, `sync:heuristics`, …) exist for a targeted run.
  Add `--strict` to fail on a *dangling* relation — one pointing at a page
  that is not in the heuristics database (deleted or archived). A relation to
  a heuristic that exists but is still being curated is normal: it is
  reported, the link is left out until the heuristic is published, and
  `--strict` tolerates it.
- `npm run redirects` — regenerate `public/.htaccess` from the committed
  inventories in `data/`. Re-run after adding or renaming content.
- `npm run check:urls` — assert that every one of the 967 indexed WordPress
  URLs is served, redirected to a page that exists, or Gone. Run after
  `npm run build`; it fails the build rather than letting a URL 404.

## Testing

Four layers, cheapest first. `npm test` runs the first three against a fresh
build; the fourth needs a deployed host.

1. **Types and build** — `astro check` (must stay 0/0/0) and `npm run build`.
2. **`tests/build.test.mjs`** — assertions over `dist/` with no browser, about a
   second. Titles, descriptions, canonicals, OG/Twitter, one `<h1>` per page,
   JSON-LD parses and carries the right types, internal links resolve and end
   in a slash, feeds and `.ics` exist, and no word is glued to a link. Most of
   these exist because that exact defect shipped once.
3. **`tests/urls.test.mjs`** — replays `public/.htaccess` against the 967-URL
   Phase 1 inventory: everything is served, redirected to a page that exists, or
   Gone, with no chains.
4. **`tests/browser.test.mjs`** — Playwright against the built site served
   statically. Horizontal overflow at 360 and 390 px (the bug class that hit 14
   of 24 story pages), the filters including the legacy `?tag=` landing, the
   carousels, the local-time and countdown scripts, rendering with JavaScript
   off, and accessible names. `TEST_FULL=1` widens the page sample from a
   handful per collection to all of them.

**`npm run verify:live <url>`** is the one that cannot run locally: it requests
real URLs from a deployed host and checks the status codes, because only
Apache/LiteSpeed proves the `.htaccess` is honoured. Run it against staging
before cutover and production after.

Not covered, deliberately: visual regression (no baseline worth maintaining for
a site still being designed), Lighthouse (run by hand at Phase 9), and link
checking of external URLs (they rot for reasons outside this repo).

## URLs and redirects

`public/.htaccess` is **generated** — edit `scripts/build-redirects.mjs`, not
the output. Its inputs are committed on purpose, because WordPress is being
decommissioned and it is the only other copy:

- `data/live-urls.txt` — the Phase 1 crawl, all 967 indexed URLs.
- `data/videos-inventory.csv` — 536 video URLs with their YouTube IDs, so the
  videos section can return later **at the same URLs**.
- `data/legacy-redirects.csv` — the 35 rules the Redirection plugin held.

Current disposition: 294 served, 412 redirected, 261 Gone. The reasoning behind
each group is in `REVIEW-2026-07-25.md` (step 3). Two rules are deliberately
commented out — `/papers/` and `/books/` become 301s to `/reading-list/` the
day that page ships.

When an editorial change in Notion retires a URL — a merged duplicate, a
renamed slug — the page stops existing on the next sync and `npm run
check:urls` reports it. Add the old → new pair to `RETIRED` in
`scripts/build-redirects.mjs`; that is the section that keeps those URLs alive.
