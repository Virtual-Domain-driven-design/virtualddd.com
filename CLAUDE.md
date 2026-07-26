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

People relation targets. There are deliberately **two**, because they are two
different things:

- **Organisers** — `collection://cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6`, the
  target of Sessions `Organiser`/`Co-Organisers`. This is an *operational*
  database: Discord accounts, virtualddd.com email, who organises what. It
  drives `/organisers/`.
- **Session Guests** — `collection://d82910e0-cac0-46f8-8a20-cb3a3376d5eb`, the
  target of Sessions `Guests`. Speakers and panellists. None of the operational
  fields apply to an external speaker, so they do not live in the organisers
  database; the fields here exist to produce good `Person` structured data, and
  the links become `sameAs`.

The cost of the split is that someone who both organises and speaks has a row
in each. That is deliberate — `Also an organiser` on the guest row marks it, so
the duplicate is findable rather than accidental. The alternative, one people
table with a flag, was rejected: it would have put 60+ external speakers into
the database the community is actually run from. On the site the two rows are
rejoined by name (`samePerson` in `src/lib/people.ts`): a guest who matches an
organiser links to that organiser page and borrows its portrait and role, so
nothing is typed twice.

Guests sync down to `src/content/session-guests/*.json` (`npm run sync:guests`)
and Sessions `guests` is an Astro `reference()` to them — the one people
relation modelled as a reference rather than a name string, because these rows
carry the profile links that become `sameAs`. The `Slug` column is what the
relation resolves to; a guest row without one produces no entry and the
sessions sync reports it.

Guests are `performer` on a session's `Event` and are named in the sidebar
credit ("With …") on every session that had them. The **Guests section itself
is gated on a `Bio`**: a panel of bare names says no more than the credit
already does, so the section appears only once someone has been introduced, and
appears by itself on the next sync after a Bio is written. `npm run test:content`
reports guests on *upcoming* sessions who still have none.

`data/guest-profiles.csv` is the one-time harvest of what the session
descriptions already said about their speakers — 8 bios, 19 roles, 4 links —
pushed into Notion by `npm run guests:profiles`. It only ever fills an **empty**
field, so anyone editing their own bio in Notion wins over a re-run. The copy
was read and written by hand: a sentence about a real person is not something
to assemble with a regex. `data/guest-bio-removals.md` lists the source blocks
still duplicated in a session description, for a human to approve before
anything is deleted from Notion.

**Speaker pages are not built.** Fifty-four pages carrying one name each would
be thin; revisit when more rows have bios.

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

  Concretely: pages that lead with a session (home, `/sessions/`) render
  **every** upcoming session, soonest first, all but the first `hidden`. The
  `js-next` sweep in `BaseLayout` picks the first one that has not finished and
  re-checks every minute, so when a session has been the page moves to the
  following one on its own. A session stays "next" for `SESSION_GRACE_MS`
  (3 hours, in `src/lib/upcoming.ts`) after its start — someone arriving late
  wants today's join link, not next month's RSVP — and that is the same window
  the `.js-live` links use. The rule lives in one place because it runs twice,
  at build and in the browser; `tests/unit/upcoming.test.mjs` is its
  specification. Anything else about a session (its appearance in the archive,
  in "latest sessions", in the feed) is settled at build time, which is fine:
  those change when an organiser marks the session `Done`, and that already
  triggers a rebuild.
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
  convention. Heuristics keeps its own older names (`Slug`,
  `Meta Description`) plus a matching `SEO Title`.
- Structured data (JSON-LD) is **generated** from existing properties, never
  hand-authored in Notion.
- Relations: model as Astro `reference()` and let the build fail on a dangling
  link rather than dropping it silently.

**House style for titles and descriptions.** Detail pages carry no brand suffix
(see `pageTitle` in `src/lib/seo.ts`), so the budget is ~60 characters for the
title and 150–160 for the description — search results truncate around there,
and the suffix was costing 15 characters of actual topic on every page.

Write an `SEO Title` only where the natural title runs long or is opaque; a
field that duplicates its own fallback is a second copy to maintain.
Descriptions are en-GB, lead with the concrete situation or the person, and
never open with "Learn how to…" — that was the Yoast voice, and it does not
sound like this community.

A blank field is a legitimate choice, because the fallbacks are good: a session
falls back to a sentence-trimmed excerpt of its abstract, and a heuristic to the
opening sentence of its body, which *is* the heuristic.

## Brand

Existing visual identity is preserved; the CSS is rebuilt against tokens
extracted from the live site (`src/styles/tokens.css`). Divi markup is not
portable — do not port it, rebuild against tokens.

`tokens.css` also holds the **overlays** (`--scrim*`, `--overlay-white-*`,
`--on-colour*`, `--tint-*`) and documents the **three breakpoints** —
640 / 800 / 900 px, with `639.98` / `799.98` max-width companions. Only
reusable surfaces are tokens: the stops inside a component's own scrim gradient
are not, and naming each of them would produce tokens nobody could reuse. There
were eleven breakpoints once; 860, 960 and 980 made the site change shape at
widths nobody chose.

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
  `BaseLayout`: `.btn`, `.chip` / `.chips`, `.card` (+ `--feature`,
  `--upcoming`, `--heuristic`), `.grid-cards`, `.tbanner` (+ `--compact`),
  `.hero-band` (+ `--padded`, `-inner`), `.page-wash`, `.lead`, `.eyebrow`,
  `.section-head`, `.detail` / `-head` / `-body` / `-side`, `.prose-body`,
  `.prose-muted`, `.prevnext`, `.filters`, `.carousel`, `.solo`,
  `.panel-cyan`, `.scrim`. Add variants **here**, not in a page's `<style>`.

  **Buttons are a closed set** on two axes — intent (default, `--accent`,
  `--ghost`, `--ink`, `--inverse`) and shape (default, `--sm`, `--block`) —
  and they compose. A page may still position a button (a margin, an
  `align-self`); it may not restyle one. Three pages had grown their own
  "full-width small sidebar button" and two their own "white button on a pink
  panel", each with a different hardcoded pink.

  Same for the three heuristic type tiles: one `.tbanner`, used as links on
  `/ddd-heuristics/`, as filter buttons on `/heuristics/` and compact on the
  home page. They had been written out three times.

  **Chips are one family too.** `.chip` is the shape; `--label` adds the
  uppercase heading treatment (a session level, a session type, a heuristic
  type); `--primary` / `--accent` / `--value` fill it; `--outline` is the
  lower-case bordered form used for content tags. `chipTone()` in
  `src/lib/heuristics` maps a heuristic type to its fill, so the colour of a
  type is decided in the same place as its name.

  **What is deliberately *not* shared:** what goes inside a `.hero-band`. The
  band itself (full-bleed, sits under the header, closes with a rule) is
  shared by three index pages, but ddd-crew and open-space fill it with a
  `.page-wash` glow while `/heuristics/` fills it with a photograph and a
  horizontal scrim. Those are different treatments, not variants of one thing,
  and the About hero — a two-column grid — is not a band at all. Extracting
  them together would cost more than the duplication does.
  **Astro does not extend a page's style scope into a child component**, so a
  `.card` override written in a page's scoped `<style>` silently never
  matches. Variants must be global.
- **`src/lib/`** — `dates` (every date format; the `data-format` values must
  match `BaseLayout`'s local-time script), `embeds` (`youtubeEmbed`),
  `excerpt`, `collections` (session split, teasers, siblings, tag options,
  relation resolution), `heuristics` (the three types — one definition),
  `upcoming` (which session is next — imported by both the build and the
  client script, so the two cannot disagree).
- **`scripts/lib/notion-md.ts`** — the Notion → markdown rules, with the API
  client, the rate limiting and the image downloads left in
  `scripts/sync-notion.ts` and injected. Pure enough to unit-test; that is the
  point, since this module decides what every generated page says.
- **`src/components/`** — `TeaserCard` is *the* card; `SessionCard`/`StoryCard`
  are thin wrappers over it. `Carousel`, `PrevNext`, `HeuristicCard`,
  `HeuristicDetail`, `HeuristicTypePage`. `PersonRow` is *the* person —
  portrait, name, role, bio, links — used for a session's host and its guests,
  with `compact` for a name we know nothing else about.
- Page `<style>` blocks are for what is genuinely local to that page only.
- Progressive enhancement is a rule, not a preference: every `<time>` ships a
  server-rendered fallback, filters only hide pre-rendered cards, the mobile
  nav ships open and is collapsed by script, no page depends on JS to show its
  content or to reach another page.
- **Never remove a focus ring.** `global.css` defines `:focus-visible` against
  the brand tokens because the near-black canvas swallows the browser default;
  the filter inputs carried `outline: none` with no replacement, which left
  keyboard visitors with nothing. A browser test asserts the ring is still
  there.
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
  (~22 MB per build; `dist` lands around 37 MB and is asserted under a 50 MB
  ceiling, so a silent prune failure shows up as a test rather than a slow rsync)
- `npm run preview` — serve the built site
- `npm run sync` — the whole content pipeline: Notion (all four collections +
  organisers and guests) then the ddd-crew repos. This is the "script and a
  commit" fallback the deploy invariant depends on; per-collection scripts
  (`sync:sessions`, `sync:heuristics`, …) exist for a targeted run. Guests sync
  **before** sessions, since a session references them.
  Add `--strict` to fail on a *dangling* relation — one pointing at a page
  that is not in the heuristics database (deleted or archived). A relation to
  a heuristic that exists but is still being curated is normal: it is
  reported, the link is left out until the heuristic is published, and
  `--strict` tolerates it.
- `npm run redirects` — regenerate `public/.htaccess` from the committed
  inventories in `data/`. Re-run after adding or renaming content.
- `npm run seo` — push `data/seo-copy.csv` into Notion (`--write` to apply;
  dry run otherwise). The SEO titles and descriptions live in Notion like
  everything else, but ~290 of them were authored at once, and a CSV is
  reviewable in a way that editing 290 Notion rows is not. Re-running is safe:
  it only writes a field whose value actually differs.
- `npm run guests:profiles` — push `data/guest-profiles.csv` (speaker roles,
  bios and links harvested from the session descriptions) into the Session
  Guests database. Dry run by default; `--write` applies. It fills **empty**
  fields only, so it can never overwrite what someone typed in Notion —
  `--force` if you mean to.
- `npm run check:urls` — assert that every one of the 967 indexed WordPress
  URLs is served, redirected to a page that exists, or Gone. Run after
  `npm run build`; it fails the build rather than letting a URL 404.

## Testing

**Test the promises, not the pixels.** A promise is something a third party
depends on and that breaks silently: a URL, a redirect, a feed, a canonical, a
JSON-LD shape, "this page works with JavaScript off", "the next session is the
next one". Those get hard tests. Layout, copy and components are what we are
still deliberately changing — the brand is the fixed point, not the design — so
tests must not pin them down.

### The test surface

Tests select **only** `[data-test]` hooks and `js-*` behaviour classes. Never a
styling class (`.card`, `.site-nav`), never an id the CSS also targets, never
visible copy. A restyle then cannot break a behaviour test, which is what makes
the design work in Phase 5 cheap to keep doing.

Current hooks: `card`, `results`, `result-count`, `filter-search`, `filter-tag`,
`filter-reset`, `type-filter`, `next-session`, `add-to-calendar`, `prev`,
`next`, `nav`, `nav-toggle`, `guest`, `person-name`. Add to that list rather
than reaching for a class.

### Blocking vs reporting

The suite sits on the publish path, so **a test an editor can turn red from
Notion must not stop a deploy** — that would make publishing hostage to CI and
break the invariant above. Two suites:

- **Blocking** (`npm test`): unit rules, `astro check`, the build, contract
  assertions over `dist/`, the redirect map, and browser behaviour. If one of
  these fails the site is broken; do not deploy.
- **Reporting** (`npm run test:content`): duplicate titles, missing meta
  descriptions, glued links, stories with no author, sessions with no start
  time. Real defects, but they belong to whoever holds the Notion page. Run
  them, read them, fix them in Notion — do not gate the deploy on them.

`npm run test:all` runs both.

### The five layers, cheapest first

1. **`tests/unit/*`** (`npm run test:unit`) — pure rules, no build, no browser,
   under a second. `notion-md` covers the Notion → markdown conversion that
   produces every page under `src/content/`: heading demotion, annotations,
   dead page-id links, tables, unknown block types, and the published /
   curating / dangling relation split. `upcoming` covers which session is next,
   including the several-upcoming case the live content cannot demonstrate.
   Run with `--import tsx`, since these import the TypeScript directly.
2. **Types and build** — `astro check` (must stay 0/0/0) and `npm run build`.
3. **`tests/build.test.mjs`** — assertions over `dist/`, about a second.
   Canonicals, OG/Twitter, one `<h1>`, internal links resolve and end in a
   slash, JSON-LD types, feeds, the archive ordered newest first, every
   upcoming session shipped, past sessions offering no RSVP while upcoming ones
   do, each `.ics` stating the session's real start time, prev/next
   round-tripping, the type pages listing only their own type, the sitemap
   holding only indexable pages that exist, the error pages, and a size ceiling
   on the deploy.
4. **`tests/urls.test.mjs`** — replays `public/.htaccess` against the 967-URL
   Phase 1 inventory: everything is served, redirected to a page that exists, or
   Gone, with no chains.
5. **`tests/browser.test.mjs`** — Playwright against the built site served
   statically. Horizontal overflow at 360 and 390 px (the bug class that hit 14
   of 24 story pages), search and filtering including the legacy `?tag=`
   landing, the next-session sweep and the countdown and join links **with the
   clock moved**, local time in a non-UTC timezone, carousels, rendering with
   JavaScript off, and accessible names. `TEST_FULL=1` widens the page sample
   from a handful per collection to all of them.

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

`ErrorDocument` points at two branded pages: `/404.html` (Astro special-cases
`404.astro`) and `/410/` (every other page is a directory, so the 410 keeps its
trailing slash, and is filtered out of the sitemap). Without them the host
serves its own — an unbranded 404 with no way back, and a bare "Gone" for the
261 URLs retired on purpose.

When an editorial change in Notion retires a URL — a merged duplicate, a
renamed slug — the page stops existing on the next sync and `npm run
check:urls` reports it. Add the old → new pair to `RETIRED` in
`scripts/build-redirects.mjs`; that is the section that keeps those URLs alive.
