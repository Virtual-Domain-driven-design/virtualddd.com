# Pre-launch review — 26 July 2026

A review of the site as it stands, from four angles: **UI design**, **front-end
engineering**, **test engineering** and **software architecture**. The two
questions asked of it were the two that matter most here — *can a small
volunteer team keep changing this?* and *can people use it?* — so those get the
weight, and everything else is subordinate to them.

Findings are evidence-first: every number below was measured against the built
site or the source, not estimated. Where I am inferring rather than measuring, I
say so.

**Verdict.** The site is in good shape and close to ready. There is nothing here
that should stop a launch except two colour-contrast failures, which are a
half-hour fix and which affect the single most important control on the site
(the RSVP button). The larger finding is not a defect at all: **the cost of
adding a sixth content type is about twelve edits in twelve files**, and that is
the number most likely to decide whether this site is still being improved in
two years.

| Area | State | Biggest single issue |
|---|---|---|
| Usability | Good, with real accessibility gaps | Chips and the RSVP button fail WCAG AA contrast |
| Front-end | Well organised, one clear duplication | Three separate implementations of "filter a list" |
| Testing | Unusually strong for a site this size | Only 2 of 10 `src/lib` modules are unit-tested |
| Architecture | Sound, honest, well documented | No seam for adding a content type — 12 files |
| Changeability | **Medium-high** | See above; the fix is documentation, not abstraction |
| Deployability | **Not ready** | No CI exists; nothing deploys yet |

---

## 1. Usability — the UI designer's view

### What is genuinely good

Worth stating first, because it is the larger part. Body text sits at **18.5:1**
contrast against the near-black canvas and card titles at **16:1** — far past
the 4.5:1 the guidelines ask for. Every page has exactly one `<h1>`, a
`<header>`, `<nav>`, `<main>` and `<footer>`, and `lang` set. Every image has an
`alt`. All 113 images on `/sessions/` are lazy-loaded. Filtering has a live
result count, a written empty state ("No sessions match your filters") and a
**Load more** control rather than an endless page. Times render in the
visitor's own timezone with a server-rendered fallback, so a session at
"19:00 GMT+1" is never ambiguous. Nothing depends on JavaScript to show content
or to reach another page — a rule the test suite enforces rather than trusts.

### U1 — Chips fail contrast. *(blocker, 30 minutes)*

Measured on `/sessions/`: a `.chip--primary` renders **white on `#16bde8`** at
12.8px — **2.22:1**. WCAG AA requires 4.5:1 for text this size. The same applies
to `.chip--accent` (pink) and `.chip--value` (purple).

Chips are not decoration: they carry the session type, the level and the
heuristic kind, on cards and on every detail page.

**The fix does not touch the brand.** The hues stay; only the text on top
changes. `--on-colour: #fff` becomes near-black. Measured on the same page, dark
text on that cyan gives **8.71:1** — the link colour in the footer already
proves it. One token in `tokens.css`, three chip rules, and the tile banners
inherit it.

### U2 — The RSVP button fails contrast. *(blocker, same fix)*

`.btn--accent` is **white on `#ec5fa6` at 16px — 3.11:1**, against 4.5:1
required. This is the primary action of the entire site: the button a visitor
presses to attend a session. Same one-token fix as U1.

### U3 — Carousel dots are 9×9 px. *(should fix, 15 minutes)*

`src/pages/index.astro:133` and `:186` render eight unlabelled-in-appearance dot
buttons each — sixteen on the home page — measured at **9×9 CSS pixels** at
390px viewport. WCAG 2.2 AA (2.5.8 Target Size) asks for 24×24. Nine pixels is
also simply hard to hit with a thumb, guideline or not.

They have proper `aria-label`s ("Session 1"…), so this is purely a hit-area
problem: keep the 9px dot, give the button 24px of padded target around it.

### U4 — Icon links are 20×20 px. *(should fix, 15 minutes)*

The website/LinkedIn icons on organiser cards measure 20×20 — fifteen of them on
`/organisers/` alone, and the same pattern in the header and footer socials.
Same criterion, same fix: pad the anchor, keep the icon.

### U5 — No skip link anywhere. *(should fix, 20 minutes)*

Zero of the eleven pages sampled offer "skip to content". The header repeats 14
links on every page, so a keyboard or switch user tabs through the whole
navigation before reaching the content, on every single page. This is the
cheapest accessibility win available.

### U6 — The heading outline jumps h1 → h3. *(should fix, 30 minutes)*

Eight of the eleven pages sampled. Cause: card titles are `<h3>` (`TeaserCard`),
and most index pages have no `<h2>` between the page title and the cards.
`/sessions/` is the exception and is correct, because it has "Upcoming" and
"Past" section headings.

To a screen-reader user navigating by heading — which is how most do navigate —
the page claims a level that is not there. Fix is editorial as much as
technical: give each index its section heading, or demote the cards.

### U7 — Filter results are not announced. *(should fix, 20 minutes)*

`/sessions/`, `/facilitating-archdes/` and `/heuristics/` all update a visible
result count when you filter, but none carries `aria-live`. A sighted user sees
"12 results"; a screen-reader user hears nothing at all and cannot tell whether
the filter did anything. The count element already exists — it needs one
attribute.

### U8 — `lang="en"` but the content is en-GB. *(trivial)*

The JSON-LD says `en-GB`, the copy is en-GB, the `<html>` element says `en`.
One character.

### U9 — No `prefers-reduced-motion` support. *(nice to have)*

Zero occurrences across all stylesheets. The carousels auto-advance and the
header animates on scroll. Some people get motion sickness from this; the
media query is three lines.

### U10 — Cards do not say who is speaking. *(feature — Notion)*

A session's guests now appear under the title on its own page, but the cards on
`/sessions/`, the home page and the sidebars still show only the title and the
host. "Who is this with?" is exactly the question a browsing visitor is asking.

### U11 — 45 of 64 guests still have no bio. *(content, not code)*

Which means the Guests block is hidden on most session pages, by design. This is
Notion work, not site work, and the reporting suite already names the ones on
upcoming sessions.

---

## 2. Front-end engineering

### F1 — Three implementations of "filter a list of cards". *(the real one)*

| Where | Script size |
|---|---|
| `src/pages/sessions/index.astro` | 47 lines |
| `src/pages/facilitating-archdes/index.astro` | 75 lines |
| `src/components/HeuristicBrowser.astro` | 65 lines |

All three do the same four things: read a search box, read a tag select, hide
non-matching pre-rendered cards, update a count and an empty state. They share
only `src/lib/filter-url.ts`, which handles the legacy `?tag=` landing.

The cost is already visible in this review: **U7 is one defect that must be
fixed in three places**, and any future improvement — remembering the filter in
the URL, adding a second facet, announcing results — costs three edits and three
chances to diverge. The three already differ in their DOM ids (`count`,
`hb-count`) and in whether they support a type filter.

This is the clearest violation of the repo's own "shared before local" rule, and
the single highest-value refactor available: **one `<CardFilter>` component**
owning markup, script and the `data-test` hooks. The three pages keep their own
cards and their own copy.

### F2 — `BaseLayout` carries 219 lines of inline script. *(should fix)*

Six behaviours in one block: sticky-header toggle, local-time rendering, live
join links, the next-session sweep, the countdown, and the mobile nav. Every
page downloads all six — the countdown ships to the privacy policy.

More importantly it cannot be unit-tested: the next-session rule *is* tested,
but only because the decision itself was extracted to `src/lib/upcoming.ts` and
the script imports it. That is the pattern to repeat for the rest.

### F3 — Page-scoped CSS is proportionate. *(no action)*

410 lines across 20 files, against 586 shared in `tokens/global/patterns`. That
ratio is healthy and the shared vocabulary is genuinely being used. The
exception is filter styling (`.result-count`, `.no-results`, `.filters`),
repeated per index — which F1 absorbs.

### F4 — 21 font files, 552 KB, no preload. *(should fix, 30 minutes)*

Seven weights across two families (Rajdhani 500/600/700, Poppins 400/500/600/700),
loaded as CSS imports with `font-display: swap` and no `<link rel="preload">`.
The result is a flash of unstyled text on first paint on a slow connection. Two
easy wins: preload the two weights above the fold, and check whether all seven
weights are actually used.

### F5 — No `srcset`. *(low)*

Every `<Image>` emits a single width — 480px for cards, 920px for hero images. On
a fixed-width card grid that is defensible, and lazy loading already prevents
the worst. Worth revisiting only if mobile data use becomes a concern.

### F6 — Index pages are large but fine. *(no action, worth knowing)*

`/sessions/` is 185 KB of HTML uncompressed (108 cards plus a 108-entry
`ItemList` in the structured data), `/heuristics/` 140 KB. Gzipped these are
around a quarter of that, and both pages ship every card so filtering can be
instant and JavaScript-free. The trade-off is deliberate and correct; the number
is here so nobody is surprised by it later.

---

## 3. Test engineering

The suite is better than most sites of this size ever get: 56 blocking
assertions across five layers, run in about 80 seconds, plus a non-blocking
content report. The layering — unit rules, types, `dist` contracts, redirect
replay, real-browser behaviour — is right, and the discipline of selecting only
`[data-test]` hooks is what makes the design safe to keep changing. Three gaps.

### T1 — Only 2 of 10 `src/lib` modules are unit-tested. *(should fix)*

Tested: `upcoming` (thoroughly, including cases the live content cannot
demonstrate) and `scripts/lib/notion-md`.

Untested directly: `seo.ts` (449 lines — every structured-data decision on the
site), `collections.ts`, `people.ts`, `markdown-page.ts`, `excerpt.ts`,
`dates.ts`, `filter-url.ts`, `heuristics.ts`.

`seo.ts` is covered indirectly by the `dist` assertions, which is real coverage
but slow feedback and shape-only. The one I would write first is **`people.ts`**:
`samePerson()` decides whether a guest links to an organiser page and inherits
their portrait. A false positive silently attributes one person's photo and
links to another — the kind of bug that is embarrassing rather than merely
broken, and it currently has no test at all.

### T2 — No automated accessibility assertions. *(should fix)*

The browser suite checks accessible names and that focus rings survive, which is
more than most. But **every finding in section 1 of this review — U1 through U7 —
would have been caught by an automated pass**, and none of them was.

One dev dependency (`axe-core`, injected by Playwright) run against six
representative pages would turn contrast, target size, heading order and
landmark defects from "found in a review before launch" into "found in CI on the
commit that caused it".

### T3 — Browser tests sample by default. *(fine, but CI should widen it)*

A handful of pages per collection unless `TEST_FULL=1`. Correct for local
feedback. Once CI exists it should run the full sweep nightly — the mobile
overflow bug that hit 14 of 24 story pages is exactly what sampling misses.

### T4 — The reporting suite could earn more. *(nice to have)*

Six checks today. Cheap additions in the same spirit: sessions with no featured
image, heuristics with no type, guests linked to no session.

---

## 4. Architecture and changeability

### A1 — Adding a content type costs about twelve edits. *(the headline)*

Not a hypothesis — this is what the Session Guests work actually touched, in
order: `content.config.ts`, `scripts/sync-notion.ts` (spec, helper, lookup,
sub-command, dispatch), `src/lib/collections.ts`, `src/lib/seo.ts`,
`src/lib/people.ts`, a new component, the session page, the `.ics` endpoint,
`llms.txt`, `llms-full.txt`, the markdown endpoint, `package.json`, the test
suite, and the documentation.

There is no seam. Nothing is *wrong* — each of those edits was necessary and
none was hard — but a new contributor cannot discover the list, and missing one
fails quietly: forget `llms.txt` and the new type is simply invisible to
machines; forget the markdown endpoint and it is invisible to agents.

**My recommendation is documentation, not abstraction.** A "collection recipe"
in the contributor guide, listing the twelve touchpoints in order, costs an hour
and helps immediately. A generic collection descriptor that generates the sync,
the routes and the endpoints would cost days, and with five collections it would
be a framework built for a sixth that may never come. Write the list down;
revisit the abstraction if a seventh type appears.

### A2 — `sync-notion.ts` is 730 lines and five commands. *(should fix, later)*

`CONTENT_SPECS` is a good table-driven core — four collections described
declaratively. But `runOrganisers` and `runGuests` are hand-written functions
that duplicate the image download, the pruning and the write loop, because the
table only models markdown collections and these two produce JSON. Extending the
table to cover "structured data, no body" would delete both functions.

### A3 — Two *published* files cited internal documents. *(fixed)*

`public/robots.txt` and the generated `.htaccess` header both pointed at
internal planning documents that no longer exist. Both are served to the public.
Caught by this review and rewritten during the cleanup that followed it.

### A4 — The URL contract is the crown jewel, and it is fragile by nature.

`data/live-urls.txt` (967 URLs), `data/legacy-redirects.csv` and
`data/videos-inventory.csv` are the *only* remaining record of the addresses the
site must keep answering: 294 URLs preserved, 412 redirected, 261 deliberately Gone. `npm run
redirects` generates `.htaccess` from them and `npm run check:urls` proves every
one is handled.

These files read like leftovers and are not. `data/README.md` now says so at the
point where somebody would reach for the delete key, and AGENTS.md explains the
contract — because otherwise a tidy-minded contributor removes them and nobody
notices until the search traffic goes.

### A5 — `migration-source/` is 36 MB, untracked, and irreplaceable. *(act now)*

It is in `.gitignore`, so it exists on exactly one laptop and in no backup: the
full export of the site that came before this one, plus the derived CSVs the
slug work used. Once the old host is switched off it cannot be recreated.
**I have deliberately not deleted it.** Copy it somewhere durable first — after
that, removing it from the working tree is safe. `shots-after/` (4.7 MB) is
genuinely disposable.

### A6 — Nothing deploys. *(blocker for launch, known)*

No `.github/workflows` exists. The build is a single 18-second command and the
content is committed, so the manual fallback holds — someone can build and rsync
by hand — but the automation the whole design assumes is not written yet.

### A7 — What is well designed, and should be protected

- **Notion is the source of truth and the generated markdown is committed.**
  Offline builds, reviewable diffs, content history in git. This is the decision
  that makes everything else calm.
- **The publish path degrades to a script and a commit.** If n8n and CI both
  vanish, publishing still works. Very few small-team sites can say that.
- **Relations are `reference()`s that fail the build**, rather than links that
  vanish silently.
- **One place per decision**: the next-session rule, the three heuristic types,
  every date format, all structured data. The rule is stated in the guide and
  actually held.
- **Tests select behaviour, not styling** — which is what has made four rounds of
  design change cheap this month.

---

## 5. What to do

### Fix before go-live

| # | Item | Effort |
|---|---|---|
| U1, U2 | Dark text on cyan/pink fills — chips and the RSVP button (one token) | 30 min |
| U5 | Skip link | 20 min |
| U7 | `aria-live` on the three result counts | 20 min |
| U3, U4 | 24px hit areas for carousel dots and icon links | 30 min |
| U8 | `lang="en-GB"` | 1 min |
| A3 | Public files must not cite internal documents | in cleanup |

That is roughly two hours, and it takes the site from "fails AA in two visible
places" to "passes the automated bar".

### Fix soon after

| # | Item | Effort |
|---|---|---|
| T2 | axe-core in the browser suite, six pages | half a day |
| F1 | One `<CardFilter>` component, replacing three scripts | half a day |
| U6 | Heading outline on the index pages | 30 min |
| T1 | Unit tests for `people.ts` and `seo.ts` | half a day |
| F4 | Font preload; drop unused weights | 30 min |
| U9 | `prefers-reduced-motion` | 15 min |

### Later, or never

`F2` (split the BaseLayout script), `A2` (fold organisers and guests into the
sync table), `F5` (`srcset`), `T4` (more reporting checks). All are real, none
is urgent, and each is cheaper once there is a reason to touch that file anyway.

### Feature requests → Notion

Not defects; they belong on the ToDo board, not in this file: guests on cards
(U10), site-wide search, a submit-a-heuristic form, bringing the videos section
back. The last three are already there.

---

## 6. Follow-up: the "fix soon after" list, and a test-suite audit

Done after the review above, in the same pass.

### What was fixed

| # | Item | Result |
|---|---|---|
| F4 | Fonts | 21 files → **6**, 552 KB → **72 KB** (latin subsets only, Poppins 500 dropped), plus a preload for the two faces above the fold |
| U6 | Heading outline | Section labels that were already visible became real `<h2>`s; the two ingests now agree that a body's shallowest heading is an h2. **Zero heading skips** across the site, from 8 of 11 pages and 160 heuristics |
| F1 | Three filters | One `<CardFilter>` + one pure rule. 187 lines of near-duplicate script → **84 shared**, and the pages carry **0**, **32** (a carousel) and **0** |
| T1 | Unit coverage | 2 of 10 `src/lib` modules → **5**, +36 unit tests (`people`, `card-filter`, `seo`) |
| T2 | axe-core | Runs over one page of each shape, WCAG 2.1/2.2 A + AA |
| U9 | Reduced motion | Done earlier, with the accessibility batch |

**axe found three defects the manual review missed**, all now fixed: a
contrast failure on the About page's AI banner subtitle, and links inside
sentences distinguished by colour alone on two pages — cyan against white text
is under the 3:1 the guidelines require, so a reader who does not perceive hue
saw no link. Links in running text are underlined now.

Two notes on the refactor. Extracting `socialCard` into its own module is what
made `seo.ts` unit-testable at all: it was the only part needing `astro:assets`,
which exists only inside a build. And the `samePerson` tests pin a **known
limitation** rather than hiding it — "Chris Simon" and "Chris Simons" match,
which is the price of matching "Kenny Schwegler" to "Kenny Baas-Schwegler".
Nobody on the site is affected; the test is there so that tightening the rule is
a decision rather than a surprise.

### The audit: were the tests holding the site still?

In places, yes. Seven kinds of coupling were found and removed — five of them
by the refactor breaking tests that should not have broken.

| Coupling | Where | Now |
|---|---|---|
| CSS id as a selector | `#load-more` | `[data-test="load-more"]` |
| Styling class as a selector | `.carousel`, `.carousel-next` | hooks on both |
| Visible copy as a region boundary | the home page's "Latest sessions" … "Follow us on Bluesky" | `[data-test="latest-sessions"]` |
| Implementation attribute | `[data-type="guiding-heuristics"]` on a filter button | reads the value off the control, so renaming a heuristic type is free |
| **A named piece of content** | `?tag=collaborative-modelling` | reads a tag off the page and slugifies it |
| Substring counting | `html.match(/data-test="card"/g)` also counted the selector inside a script | `countHook()`, which strips scripts and counts elements |
| Hardcoded extension list | adding a font preload broke the internal-link test | any href with an extension is a file |

The most valuable change is the last category in the table above but one.
**`assert.ok(sessions.length > 100)` meant an editor unpublishing nine sessions
would turn the deploy red** — which is precisely what the suite's own rule
forbids. Those magic floors are now relationships:

- every published session has a page,
- every published heuristic has a `DefinedTerm`,
- every entry in a content collection offers its markdown,
- `llms-full.txt` carries every entry we author,
- an unknown tag shows *exactly* what the page holds, rather than "more than 100".

Each says what we actually mean, catches more (a page lost between content and
build, not just a big drop), and cannot be broken from Notion. Where no
relationship exists the floor was lowered to one only a broken build could
reach, with a comment saying that is what it is for.

**Verdict: the suite now helps a refactor rather than resisting one.** The
evidence is this pass — replacing three filter implementations with one changed
markup, ids, attributes and script structure across three pages, and every test
that broke was a test that had been reaching past the agreed surface. The rules
that prevent a recurrence are in AGENTS.md, "The test surface".


---

## 7. Follow-up: the layout audit, and "later, or never"

### Was anything else flattened?

The stories column was the only one. Diffing every index and detail page
against the state before the card consolidation:

- `.lead` (52rem) and `.prose-body` (42rem) both **survived into the shared
  layer at the same values** — they read as "lost" in a page diff only because
  they moved to `patterns.css`.
- What else disappeared from the pages was card *internals* — `.os-card`,
  `.story-card`, their thumbnails and bodies — replaced by the shared `.card`.
  That is the consolidation working.
- Open Space and ddd-crew kept their responsive 1 → 2 → 3 grids exactly.
- `/organisers/` had no page-local layout before; it was written in that commit.

So: one regression, now fixed, and the lesson is written into AGENTS.md — the
shared grid is a default, not an obligation.

### The last four items

| # | Item | Result |
|---|---|---|
| F2 | Split the `BaseLayout` script | 219 lines in a layout → three modules in `src/scripts/`, imported by a 6-line block. The layout is 274 lines, down from 332 |
| A2 | Fold organisers and guests into the sync table | Two hand-written functions duplicating the download, write and prune loops → one `PEOPLE_SPECS` table. **The output is byte-identical**, which is the proof it was a refactor |
| F5 | `srcset` | Opt-in, applied where the box really changes size: the stories index now sends a phone **0.28 MB instead of 0.68 MB**, for +1 MB in the deploy |
| T4 | Reporting checks | Three added: entries with no featured image, heuristics with no type, and past sessions with neither a recording nor a write-up |

Each new reporting check was verified against the built site to confirm it
measures something — the shortest past-session body is 32 words, so the
"nothing to show for it" check is live rather than vacuous, and the heuristic
check reads all 151 cards rather than passing by accident on a bad selector.

The build is 19 seconds and `dist` is 40 MB against a 50 MB ceiling.
