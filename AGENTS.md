# AGENTS.md — virtualddd.com

The working brief for this repository. Written for **anyone changing this site:
a person, a coding agent, or the two together**. Use whichever agent you like —
this file is the shared context, and it is the one that has to stay true.

If your tool looks for a different filename, point it here. `CLAUDE.md` is a
pointer to this file for exactly that reason.

---

## What this is

virtualddd.com is the site of **Virtual DDD**, a small, volunteer-run online
community around Domain-Driven Design, software architecture and design. It
publishes:

- **sessions** — live online meetups people RSVP to, then watch back
- **open spaces** — participant-led unconferences
- **stories** — on facilitating software architecture and design
- **heuristics** — a curated collection of rules of thumb
- **ddd-crew** — community tools republished under CC BY-SA 4.0

It is a **static Astro site** whose content comes from **Notion**, built in CI
and deployed over SSH. The team is small and time is short, so the guiding
constraint behind every decision here is *low ongoing maintenance*.

## First time here?

```bash
npm install
npm run dev          # http://localhost:4321
npm test             # the blocking suite (~80s): unit, build, contracts, browser
```

The everyday loop is **not** editing this repo. It is:

1. Edit the content in **Notion**.
2. `npm run sync` — pulls Notion and the ddd-crew repos into `src/content/`.
3. `npm test` — if it is green, the site is not broken.
4. Commit the generated markdown and push. That deploys.

You need `NOTION_TOKEN` in `local.env` to sync. Ask an organiser for one. You do
**not** need it to build, test or work on the site's code — the content is
committed.

## How we work

These are the guardrails. They are what keeps a volunteer-run site coherent when
different people (and different agents) touch it months apart.

- **The brand is the fixed point.** The visual identity is preserved. Layout,
  copy, components and structure are all open to improvement; the colours, the
  logo and the feel are not up for redesign.
- **Small steps, section by section.** Improvement is opt-in per section, never
  a big-bang rebuild. Sections ship independently.
- **Propose options, then ask.** For anything that changes what a visitor sees,
  act as designer *and* engineer: work out what the page and the Notion data
  actually do, name the friction, offer options with a recommendation — and let
  the maintainers decide. Recommend; do not unilaterally redesign.
- **Improvements can land on either side.** Sometimes the right fix is in the
  Notion schema or the editing workflow, not in the code. Changing Notion is in
  scope.
- **Feature ideas go to Notion**, to the *Virtual DDD ToDo* board, not into a
  file in this repo. Code changes go here; wishes go there.

---

## Content model

**Notion is the source of truth.** Everything under `src/content/` is
**generated** by the sync scripts and **never hand-edited**. It is committed on
purpose: content history in git, offline builds, and diffs you can review.

| Collection | Notion data source (`collection://…`) |
|---|---|
| sessions | `33e9db0a-1418-4a3e-a053-33fa384e5e93` |
| open-spaces | `0cfb73c7-a638-4948-a4df-5fe06dcd2dd1` |
| stories | `25aa485a-fafc-8047-94b7-000b3bbb228c` |
| heuristics | `e7743290-3850-404e-ae98-23a4caf0488e` |
| organisers | `cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6` |
| session guests | `d82910e0-cac0-46f8-8a20-cb3a3376d5eb` |

ddd-crew content comes from GitHub, not Notion (`npm run sync:ddd-crew`).

### Two people databases, deliberately

- **Organisers** drive `/organisers/` and are the target of a session's
  `Organiser` / `Co-Organisers`. This is an *operational* database: Discord
  accounts, community email, who runs what.
- **Session Guests** are the speakers and panellists. None of those operational
  fields apply to an external speaker, so they do not live in the organisers
  database. The fields here exist to produce good `Person` structured data, and
  the links become `sameAs`.

The cost is that someone who both organises and speaks has a row in each. That
is deliberate — `Also an organiser` marks it — and the alternative, one people
table with a flag, was rejected because it would put 60+ external speakers into
the database the community is actually run from. On the site the two rows are
rejoined by name (`samePerson` in `src/lib/people.ts`): a guest who matches an
organiser links to that organiser page and borrows its portrait, so nothing is
typed twice.

**A guest has no slug, no page and no role field.** The entry file is named
`kebab(name)` purely so a session's `guests` relation resolves; it is never a
URL, so renaming a guest in Notion is free. What someone does belongs in their
bio — "Matthew is the co-author of Team Topologies" — not in a field beside it:
one field is one thing for an editor to fill in, and it reads as a sentence
rather than a job title.

Guests render at two levels:

- **Every** session with guests names them under the title — `Guests: A, B` —
  which is the question a reader arrives with.
- A guest with a **`Bio`** (and a portrait, if there is one) gets a block below
  the description. No bio, no block; write one in Notion and it appears on the
  next sync. `npm run test:content` reports guests on *upcoming* sessions who
  have none.

Either way they are `performer` on the session's `Event`, so the structured data
never depends on how much bio anyone got round to writing.

`data/guest-profiles.csv` + `npm run guests:profiles` pushes bios and links into
Notion, filling **empty fields only** so a person editing their own bio always
wins over a re-run.

### Publish gates (per database, not global)

- **Sessions** render in two states, derived from `Datetime`, not from a manual
  flip: `Status = Published` + a future `Datetime` → **upcoming** (RSVP);
  `Status = Done` → **past archive** (recording, notes). `Ended` is an optional
  internal "awaiting post-production" marker the site ignores.

  The upcoming→past transition is **client-side**. Pages that lead with a
  session render *every* upcoming session, soonest first, all but the first
  hidden; the `js-next` sweep in `BaseLayout` picks the first that has not
  finished and re-checks every minute. So the passage of time never needs a
  rebuild. A session stays "next" for `SESSION_GRACE_MS` (3 hours, in
  `src/lib/upcoming.ts`) after its start — someone arriving late wants today's
  join link, not next month's RSVP — and that is the same window the `.js-live`
  links use. The rule lives in one place because it runs twice, at build and in
  the browser; `tests/unit/upcoming.test.mjs` is its specification.

- **Open spaces, stories, heuristics**: `Status = Published`.
- Only rows passing their gate produce files.

### Relations

Model them as Astro `reference()` and let the build fail on a dangling link
rather than dropping it silently. The sync distinguishes two cases and says
which: a heuristic that exists but is still being curated (normal — the link
appears when it is published) versus a relation pointing at a page that is not
in the database at all (a real dangling reference; `--strict` fails on it).

---

## The URL contract

**This is the part to be most careful with.** The site answers 967 public
addresses, many of which predate the current build and are still linked from
search results, newsletters and other people's blog posts. That contract is
worth more than any code in this repo.

- **294 are served** — the page exists at that address.
- **412 redirect** — one hop, to a page that exists.
- **261 return 410 Gone** — retired on purpose, so search engines drop them
  cleanly instead of showing a soft 404 for years.

`public/.htaccess` is **generated** — edit `scripts/build-redirects.mjs`, never
the output. Its inputs are committed on purpose and **must not be deleted**:

- `data/live-urls.txt` — the full inventory of 967 addresses.
- `data/videos-inventory.csv` — 536 video URLs with their YouTube IDs, so that
  section can return later **at the same URLs**.
- `data/legacy-redirects.csv` — 35 rules inherited from the old redirect table.

`npm run check:urls` proves every one of the 967 is served, redirected or Gone,
with no chains, and fails the build otherwise. Two rules are deliberately
commented out: `/papers/` and `/books/` become 301s to `/reading-list/` the day
that page ships.

`ErrorDocument` points at two branded pages: `/404.html` and `/410/`. Without
them the host serves its own — an unbranded 404 with no way back, and a bare
"Gone" for the 261 addresses retired on purpose.

**When an editorial change retires a URL** — a merged duplicate, a renamed slug
— the page stops existing on the next sync and `npm run check:urls` says so. Add
the old → new pair to `RETIRED` in `scripts/build-redirects.mjs`.

Other standing rules:

- `trailingSlash: 'always'`. Every internal link ends in a slash; a test
  enforces it, because the alternative is a 301 on every click.
- **A slug is a promise.** Changing one changes a URL and needs a redirect.
- Never remove a page without deciding whether its address should redirect or
  return Gone.

---

## SEO and structured data

Structured data (JSON-LD) is **generated** from properties we already hold,
never hand-authored in Notion. It lives in `src/lib/seo.ts` — one helper per
kind (`sessionJsonLd`, `storyJsonLd`, `heuristicJsonLd`, `person`,
`organization`, `heuristicSet`) so a type is described the same way wherever it
appears, and `BaseLayout` emits the single `@graph` it is handed.

**Coverage is every page but `/410/`**, which is an error body. Detail pages get
their type, index pages a `CollectionPage` whose `ItemList` is what they list,
standalone pages a plain `WebPage` — and **every page except the home page
carries a `BreadcrumbList`**, built from `SECTIONS` in the same file so a crumb
cannot call a section something the navigation does not.

**A heuristic is a `DefinedTerm`, not an article.** It is a named,
self-contained rule with an author — the most quotable thing on the site — so
each is a term in the `DefinedTermSet` that `/heuristics/` declares, paired with
the `WebPage` that explains it. The term carries what another system would cite;
the page carries the authors, the tags, the `relatedLink` graph to sibling
heuristics, and the term's `subjectOf` links to the sessions and stories that
discussed it.

**House style for titles and descriptions.** Detail pages carry no brand suffix
(see `pageTitle`), so the budget is ~60 characters for a title and 150–160 for a
description — search results truncate around there, and a suffix costs 15
characters of actual topic on every page. Indexes keep the suffix, because
"Heuristics" alone says nothing.

Write an `SEO Title` only where the natural title runs long or is opaque; a
field that duplicates its own fallback is a second copy to maintain.
Descriptions are en-GB, lead with the concrete situation or the person, and
never open with "Learn how to…". A blank field is a legitimate choice, because
the fallbacks are good: a session falls back to a trimmed excerpt of its
abstract, a heuristic to the opening sentence of its body — which *is* the
heuristic.

---

## AI legibility

The site is meant to be read, cited and quoted by answer engines as well as
people. `robots.txt` allows `GPTBot`, `ClaudeBot`, `PerplexityBot`,
`Google-Extended` and `CCBot` by name, and says why in the file.

Three surfaces, in ascending order of appetite:

- **`/llms.txt`** — the table of contents: every session, story, heuristic, tool
  and open space, one line each, with the guests on a session because "who spoke
  about X" is what an archive of talks gets asked.
- **`<page>/index.md`** — the markdown behind any content page, 299 of them,
  advertised with `<link rel="alternate" type="text/markdown">`. Front matter
  names the source URL, the author and the date; then the words, with no nav to
  strip. `src/lib/markdown-page.ts` builds it, and `.htaccess` carries the
  `AddType` so the host does not serve it as a download.
- **`/llms-full.txt`** — the whole corpus in one request, ~500 KB.
  **ddd-crew is deliberately excluded**: it is republished under CC BY-SA with
  its canonical upstream, so folding it into a file that reads as ours would be
  the wrong thing to do with a share-alike licence.

None of this is a separate artefact to maintain — it is all generated from the
markdown the sync already writes, which is why it is nearly free.

---

## ddd-crew content

Mostly CC BY-SA 4.0 (share-alike). Attribution to each repo and its contributors
is **mandatory**, in the layout rather than per page, with a link to the licence.
`rel=canonical` points upstream, since `ddd-crew.github.io` already publishes
these. The licence and the credit are in the structured data and in each page's
markdown too, so they survive being read without the HTML.

---

## Brand

The visual identity is preserved. The CSS is built against tokens in
`src/styles/tokens.css`, which also holds the overlays (`--scrim*`,
`--overlay-white-*`, `--on-colour*`, `--tint-*`) and documents the **three
breakpoints** — 640 / 800 / 900 px, with `639.98` / `799.98` max-width
companions. Only reusable surfaces are tokens: the stops inside one component's
scrim gradient are not, and naming each would produce tokens nobody could reuse.
There were eleven breakpoints once; three of them made the site change shape at
widths nobody chose.

### Design rules

Anything not covered here is open — the brand is the fixed point, not the layout.

- **Card colour.** Dark cards (`.card`) are the default. White
  (`.card--heuristic`) means *this is a heuristic* — an index card you could
  pull out of a box — and is used wherever a heuristic appears, including inside
  session and story pages. No other content type uses a white card.
- **Text on photographs.** Never rely on a text-shadow alone. Anything set over
  a photographic or painted background gets `.scrim` (or its own plate). The
  Kandinsky-style tiles are bright and busy; small copy over them without an
  overlay is unreadable.
- **One primary action per view.** The upcoming-session hero offers RSVP, with
  everything else demoted. Join links are marked `.js-live` and appear only from
  two hours before the start — before that they are noise — and the page still
  shows them if JavaScript is off.
- **Text on a brand fill is ink, not white.** The brand colours are bright:
  white on cyan measured 2.22:1 and white on pink 3.11:1, both under the 4.5:1
  small text needs, and the pink one was the RSVP button. So there are two
  tokens and they are not interchangeable — `--on-brand` (ink) for text on a
  *solid* fill: a chip, a button, a panel; `--on-colour` (white) for text over a
  *photograph*, where a dark scrim is already doing the work. A browser test
  measures the real ratio, so a new fill cannot quietly fail.

---

## Code conventions

**Shared before local.** A pattern used by more than one section lives in the
shared layer, never copied into a second page. Copying is what once made
"restyle the cards" a sixteen-file edit.

- **`src/styles/patterns.css`** — the shared UI vocabulary, loaded once by
  `BaseLayout`: `.btn`, `.chip` / `.chips`, `.card` (+ `--feature`,
  `--upcoming`, `--heuristic`), `.grid-cards`, `.tbanner` (+ `--compact`),
  `.hero-band` (+ `--padded`, `-inner`), `.page-wash`, `.lead`, `.eyebrow`,
  `.section-head`, `.detail` / `-head` / `-body` / `-side`, `.prose-body`,
  `.prose-muted`, `.prevnext`, `.filters`, `.carousel`, `.solo`, `.panel-cyan`,
  `.scrim`. Add variants **here**, not in a page's `<style>`.

  **Buttons are a closed set** on two axes — intent (default, `--accent`,
  `--ghost`, `--ink`, `--inverse`) and shape (default, `--sm`, `--block`) — and
  they compose. A page may position a button; it may not restyle one.

  **Chips are one family.** `.chip` is the shape; `--label` adds the uppercase
  heading treatment; `--primary` / `--accent` / `--value` fill it; `--outline`
  is the bordered form used for content tags. `chipTone()` in
  `src/lib/heuristics` maps a heuristic type to its fill, so a type's colour is
  decided where its name is.

  **Deliberately not shared:** what goes *inside* a `.hero-band`. The band
  itself is shared by three index pages, but one fills it with a glow and
  another with a photograph and a scrim. Those are different treatments, not
  variants of one thing.

  **Astro does not extend a page's style scope into a child component**, so a
  `.card` override written in a page's scoped `<style>` silently never matches.
  Variants must be global.

- **`src/lib/`** — `dates` (every date format; the `data-format` values must
  match `BaseLayout`'s local-time script), `embeds`, `excerpt`, `collections`
  (session split, teasers, siblings, tag options, reference resolution),
  `heuristics` (the three types — one definition), `people` (name matching and
  profile links), `seo` (all structured data), `markdown-page`, `upcoming`
  (which session is next — imported by both the build and the client script, so
  the two cannot disagree).
- **`scripts/lib/notion-md.ts`** — the Notion → markdown rules, with the API
  client, rate limiting and image downloads left in `scripts/sync-notion.ts` and
  injected. Pure enough to unit-test, which matters because this module decides
  what every generated page says.
- **`src/components/`** — `TeaserCard` is *the* card; `SessionCard` and
  `StoryCard` are thin wrappers. `PersonRow` is *the* person — portrait, name,
  role, bio, links — used for a session's host and its guests. `CardFilter` is
  *the* filter: search, facets, result count, empty state and "load more" over
  any grid of cards carrying the `data-search` / `data-<facet>` contract.
- **`src/scripts/`** — the client-side behaviour, one module per concern
  (`header`, `local-time`, `session-timing`), imported by `BaseLayout`'s single
  script. Anything a page needs on the client goes here, not into a page's
  `<script>`, so it can be read on its own.
- **The shared card grid is a default, not an obligation.** `.grid-cards` suits
  cards you scan; the stories archive is a single 52rem column because a story
  is a long read with an excerpt under it, and three narrow columns turn that
  into a wall of thumbnails. Consolidating markup must not flatten a layout
  that was chosen.
- **Responsive images are opt-in.** `TeaserCard` serves one width, which is
  right for a card that is 260–400px wide at every breakpoint. Pass `imgSizes`
  where the box genuinely changes size — the single-column stories list is
  832px on a desktop and 350px on a phone, and that one prop halved what a
  phone downloads.
- Page `<style>` blocks are for what is genuinely local to that page.
- **Progressive enhancement is a rule, not a preference.** Every `<time>` ships
  a server-rendered fallback, filters only hide pre-rendered cards, the mobile
  nav ships open and is collapsed by script, and no page depends on JavaScript
  to show its content or to reach another page.
- **Never remove a focus ring.** `global.css` defines `:focus-visible` against
  the brand tokens because the near-black canvas swallows the browser default. A
  browser test asserts it is still there.
- **The accessibility floor**, each held down by a test: text on a brand fill
  clears 4.5:1; the first tab stop is the skip link and it lands in `<main>`;
  filtering announces its result count (`aria-live`); every `button` is at least
  24×24. A link inside a sentence is exempt from that last one (WCAG 2.5.8,
  inline) — a button never is. `prefers-reduced-motion` is honoured globally,
  because the motion here is decoration and never information.
- `astro check` must stay at **0 errors, 0 warnings, 0 hints**.

---

## Adding a content type

There is no single seam for this — a new collection touches about a dozen
places, and forgetting one usually fails *quietly*. Work down this list in
order; each step is small.

1. **`src/content.config.ts`** — a `defineCollection` with a Zod schema
   mirroring the Notion properties. Relations become `reference()`.
2. **`scripts/sync-notion.ts`** — add a `CONTENT_SPECS` entry (a collection with
   a markdown body) or a `PEOPLE_SPECS` entry (structured data, no body). Both
   are tables: say what is different about the new collection, not how to fetch
   it.
3. **`package.json`** — a `sync:<name>` script, and add it to `sync:notion`. If
   another collection references it, sync it **first**.
4. **Routes** — `src/pages/<section>/index.astro` and `[slug].astro`.
5. **`src/pages/<section>/[slug]/index.md.ts`** — the markdown twin, and pass
   `markdown` to `BaseLayout` so the page advertises it.
6. **`src/lib/seo.ts`** — a JSON-LD helper for the type, a `SECTIONS` entry for
   breadcrumbs, and `collectionPage(...)` on the index.
7. **`src/lib/collections.ts`** — any shared query the pages both need.
8. **`src/pages/llms.txt.ts`** — a "Start here" line and a section.
9. **`src/pages/llms-full.txt.ts`** — unless the content is republished from
   elsewhere under a share-alike licence.
10. **`src/pages/rss.xml.ts`** — only if the type belongs in the feed.
11. **`astro.config.mjs`** — a sitemap `serialize` rule if it needs a priority.
12. **Tests** — a `data-test` hook if it has behaviour, a contract assertion in
    `tests/build.test.mjs`, and this file updated.

If you find yourself doing this a third time, that is the moment to build the
abstraction — not before. With five collections, the list is cheaper than the
framework.

---

## Testing

**Test the promises, not the pixels.** A promise is something a third party
depends on and that breaks silently: a URL, a redirect, a feed, a canonical, a
JSON-LD shape, "this page works with JavaScript off", "the next session is the
next one". Those get hard tests. Layout, copy and components are what we are
still deliberately changing, so tests must not pin them down.

### The test surface

Tests select **only** `[data-test]` hooks and `js-*` behaviour classes. Never a
styling class, never an id the CSS also targets, never visible copy. A restyle
then cannot break a behaviour test — which is what makes design work cheap to
keep doing.

Current hooks: `card`, `results`, `result-count`, `filter-search`, `filter-tag`,
`filter-reset`, `type-filter`, `load-more`, `next-session`, `add-to-calendar`,
`prev`, `next`, `nav`, `nav-toggle`, `guest`, `guest-credit`, `person-name`,
`skip-link`, `carousel`, `carousel-prev`, `carousel-next`, `latest-sessions`.
Add to that list rather than reaching for a class.

**A test must never be something an editor can turn red.** The blocking suite
sits on the publish path, so it may not depend on how much content exists or on
what any of it says. Two rules follow:

- **Assert a relationship, not a number.** "Every published session has a page"
  (`published('sessions')` in `tests/helpers.mjs`) says exactly what we mean and
  cannot be broken from Notion. `sessions.length > 100` said the same thing
  until somebody unpublished nine sessions. Where no relationship exists, use a
  floor low enough that only a broken build reaches it, and say so in a comment.
- **Never name a piece of content.** Read the tag off the page and slugify it;
  do not write `?tag=collaborative-modelling` and make a rename a CI failure.

**Count elements, not text.** `html.match(/data-test="card"/g)` also counts the
selector inside an inline script that looks for those cards. `countHook()` and
`markup()` in `tests/helpers.mjs` strip scripts first.

**The one place a test may name a styling class** is a test whose subject *is*
the styling: the contrast check reads `.chip--primary` because the question it
asks is "what does that class look like". Nothing else.

### Blocking vs reporting

The suite sits on the publish path, so **a test an editor can turn red from
Notion must not stop a deploy** — that would make publishing hostage to CI.

- **Blocking** (`npm test`): unit rules, `astro check`, the build, contract
  assertions over `dist/`, the redirect map, browser behaviour. If one fails the
  site is broken; do not deploy.
- **Reporting** (`npm run test:content`): duplicate titles, missing
  descriptions, glued links, stories with no author, guests with no bio on an
  upcoming session. Real defects, but they belong to whoever holds the Notion
  page. Read them, fix them in Notion — do not gate the deploy on them.

`npm run test:all` runs both.

### The five layers, cheapest first

1. **`tests/unit/*`** (`npm run test:unit`) — pure rules, no build, no browser,
   under a second. Run with `--import tsx`, since they import the TypeScript
   directly. `notion-md` (what every generated page says), `upcoming` (which
   session is next), `card-filter` (which cards a filter leaves showing),
   `people` (whether two names are one person — it decides whose photograph
   appears), `seo` (every structured-data decision).

   This is the layer to add to when you change a rule. `seo.ts` and
   `card-filter.ts` are unit-tested precisely so they can be rewritten: the
   tests say what the output must still mean, not how the code is arranged.
   `socialCard` lives in its own module for the same reason — it needs
   `astro:assets`, which only exists inside a build, and keeping it out of
   `seo.ts` is what makes `seo.ts` testable at all.
2. **Types and build** — `astro check` (0/0/0) and `npm run build`.
3. **`tests/build.test.mjs`** — assertions over `dist/`: canonicals, OG tags,
   one `<h1>`, internal links, JSON-LD shapes and breadcrumbs, feeds, archive
   ordering, every upcoming session shipped, `.ics` start times, prev/next
   round-tripping, the sitemap, the error pages, the markdown twins, and a size
   ceiling on the deploy.
4. **`tests/urls.test.mjs`** — replays `public/.htaccess` against the 967-URL
   inventory.
5. **`tests/browser.test.mjs`** — Playwright against the built site: horizontal
   overflow at 360 and 390 px, search and filtering, the next-session sweep and
   countdown **with the clock moved**, local time in a non-UTC timezone,
   carousels, rendering with JavaScript off, accessible names, focus rings.
   `TEST_FULL=1` widens the sample to every page. It also runs **axe-core**
   over one page of each shape, scoped to WCAG 2.1/2.2 A and AA — the audit
   that would have caught the contrast, target-size and heading defects a human
   review had to find by hand.

**`npm run verify:live <url>`** is the one that cannot run locally: it requests
real URLs from a deployed host and checks the status codes, because only the
real server proves the `.htaccess` is honoured. Run it against staging before a
release and against production after.

Not covered, deliberately: visual regression (no baseline worth maintaining for
a site still being designed), Lighthouse (run by hand before a release), and
link checking of external URLs (they rot for reasons outside this repo).

---

## Deploy

- Build in **CI only**, never on the host.
- The pipeline (Notion → n8n → GitHub Actions → rsync, with a post-deploy
  webhook for the social posts) is **automation over a manual process**. Running
  the sync script and `git push` by hand must always produce a correct deploy.
  If the automation breaks, publishing degrades to a script and a commit — never
  an outage. Keep it that way.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Static build to `dist/`, then `prune-dist.mjs` drops the unreferenced originals Astro emits alongside its `.webp` (~22 MB a build). `dist` lands around 40 MB and is asserted under a 50 MB ceiling, so a silent prune failure shows up as a test rather than a slow rsync |
| `npm run preview` | Serve the built site |
| `npm run sync` | The whole content pipeline: Notion (all collections, organisers, guests) then the ddd-crew repos. Guests sync **before** sessions, since sessions reference them. `--strict` fails on a dangling relation |
| `npm run sync:<name>` | One collection, for a targeted run |
| `npm run redirects` | Regenerate `public/.htaccess` from the inventories in `data/`. Re-run after adding or renaming content |
| `npm run check:urls` | Assert all 967 inherited URLs are served, redirected or Gone. Run after `npm run build` |
| `npm run seo` | Push `data/seo-copy.csv` into Notion (`--write` to apply). Only writes a field whose value actually differs |
| `npm run guests:profiles` | Push `data/guest-profiles.csv` into the guests database. Fills empty fields only |
| `npm test` | The blocking suite |
| `npm run test:content` | The reporting suite |
| `npm run verify:live <url>` | Check a deployed host's status codes |
