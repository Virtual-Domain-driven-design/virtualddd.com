# Brand and code conventions

The visual identity, the design rules that keep it, how the code is
organised, and what it costs to add a content type. Read this before writing
CSS, adding a component, or adding a collection.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# Brand

The visual identity is preserved. The CSS is built against tokens in
`src/styles/tokens.css`, which also holds the overlays (`--scrim*`,
`--overlay-white-*`, `--on-colour*`, `--tint-*`) and documents the **three
breakpoints**: 640 / 800 / 900 px, with `639.98` / `799.98` max-width
companions. Only reusable surfaces are tokens: the stops inside one component's
scrim gradient are not, and naming each would produce tokens nobody could reuse.
There were eleven breakpoints once; three of them made the site change shape at
widths nobody chose.

## Design rules

Anything not covered here is open. The brand is the fixed point, not the layout.

- **Card colour.** Dark cards (`.card`) are the default. White
  (`.card--heuristic`) means *this is a heuristic*, an index card you could pull
  out of a box. It is used wherever a heuristic appears, including inside
  session and story pages. No other content type uses a white card.
- **Text on photographs.** Never rely on a text-shadow alone. Anything set over
  a photographic or painted background gets `.scrim` (or its own plate). The
  Kandinsky-style tiles are bright and busy; small copy over them without an
  overlay is unreadable.
- **One primary action per view.** The upcoming-session hero offers RSVP, with
  everything else demoted. Join links are marked `.js-live` and appear only from
  two hours before the start (before that they are noise), and the page still
  shows them if JavaScript is off.
- **`&` in a title, `and` in a sentence.** The stories series is named in seven
  places and was split four ways to three, which is the sort of thing nobody
  notices individually and everybody feels. So: the h1, the podcast card and
  the 404 suggestion are labels and take `&`; the meta description, `llms.txt`,
  the AI-usage copy and the README are prose and take `and`. The series is
  **Stories of Facilitating Software Architecture & Design** — architecture
  first, and *of* rather than *on*. The community tagline is a different phrase
  ("Domain-Driven Design, software architecture and design") and is prose
  wherever it appears, including the footer.
- **Text on a brand fill is ink, not white.** The brand colours are bright:
  white on cyan measured 2.22:1 and white on pink 3.11:1, both under the 4.5:1
  small text needs, and the pink one was the RSVP button. So there are two
  tokens and they are not interchangeable: `--on-brand` (ink) for text on a
  *solid* fill: a chip, a button, a panel; `--on-colour` (white) for text over a
  *photograph*, where a dark scrim is already doing the work. A browser test
  measures the real ratio, so a new fill cannot quietly fail.

---

# Code conventions

**Shared before local.** A pattern used by more than one section lives in the
shared layer, never copied into a second page. Copying is what once made
"restyle the cards" a sixteen-file edit.

- **`src/styles/patterns.css`**: the shared UI vocabulary, loaded once by
  `BaseLayout`: `.btn`, `.chip` / `.chips`, `.card` (+ `--feature`,
  `--upcoming`, `--heuristic`), `.grid-cards`, `.tbanner` (+ `--compact`),
  `.hero-band` (+ `--padded`, `-inner`), `.page-wash`, `.lead`, `.eyebrow`,
  `.section-head`, `.detail` / `-head` / `-body` / `-side`, `.prose-body`,
  `.prose-muted`, `.prevnext`, `.filters`, `.carousel`, `.solo`, `.panel-cyan`,
  `.scrim`. Add variants **here**, not in a page's `<style>`.

  **Buttons are a closed set** on two axes that compose: intent (default,
  `--accent`, `--ghost`, `--ink`, `--inverse`) and shape (default, `--sm`,
  `--block`). A page may position a button; it may not restyle one.

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

- **`src/lib/`**: `dates` (every date format; the `data-format` values must
  match `BaseLayout`'s local-time script), `embeds`, `excerpt`, `collections`
  (session split, teasers, siblings, tag options, reference resolution),
  `heuristics` (the three types, one definition), `people` (name matching and
  profile links), `seo` (all structured data), `markdown-page`, `upcoming`
  (which session is next, imported by both the build and the client script, so
  the two cannot disagree).
- **`scripts/lib/notion-md.ts`**: the Notion → markdown rules, with the API
  client, rate limiting and image downloads left in `scripts/sync-notion.ts` and
  injected. Pure enough to unit-test, which matters because this module decides
  what every generated page says.
- **`src/components/`**: `TeaserCard` is *the* card; `SessionCard` and
  `StoryCard` are thin wrappers. `ConferenceCard` is deliberately **not** one:
  a teaser leads with a photograph cropped to 16/9, and a logo is the one image
  you must never crop. It keeps `.card` for the surface and swaps the thumbnail
  for a fixed-height plate the logo is contained on. `PersonRow` is *the* person (portrait, name,
  role, bio, links), used for a session's host and its guests. `CardFilter` is
  *the* filter: search, facets, result count, empty state and "load more" over
  any grid of cards carrying the `data-search` / `data-<facet>` contract.
- **`src/scripts/`**: the client-side behaviour, one module per concern
  (`header`, `local-time`, `session-timing`, `conference-timing`), imported by
  `BaseLayout`'s single script. The last two exist for the same reason: the
  site rebuilds on a Notion diff, and time passing is not a diff. Anything a page needs on the client goes here, not into a page's
  `<script>`, so it can be read on its own.
- **The shared card grid is a default, not an obligation.** `.grid-cards` suits
  cards you scan; the stories archive is a single 52rem column because a story
  is a long read with an excerpt under it, and three narrow columns turn that
  into a wall of thumbnails. Consolidating markup must not flatten a layout
  that was chosen.
- **Responsive images are opt-in.** `TeaserCard` serves one width, which is
  right for a card that is 260–400px wide at every breakpoint. Pass `imgSizes`
  where the box genuinely changes size. The single-column stories list is
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
  inline). A button never is. `prefers-reduced-motion` is honoured globally,
  because the motion here is decoration and never information.
- `astro check` must stay at **0 errors, 0 warnings, 0 hints**.

---

# Adding a content type

There is no single seam for this. A new collection touches about a dozen
places, and forgetting one usually fails *quietly*. Work down this list in
order; each step is small.

1. **`src/content.config.ts`**: a `defineCollection` with a Zod schema
   mirroring the Notion properties. Relations become `reference()`.
2. **`scripts/sync-notion.ts`**: add a `CONTENT_SPECS` entry (a collection with
   a markdown body) or a `ROW_SPECS` entry (structured data, no body — the
   organisers, guests and conferences shape). Both are tables: say what is
   different about the new collection, not how to fetch it.
3. **`package.json`**: a `sync:<name>` script, and add it to `sync:notion`. If
   another collection references it, sync it **first**.
4. **Routes**: `src/pages/<section>/index.astro` and `[slug].astro`.
5. **`src/pages/<section>/[slug]/index.md.ts`**: the markdown twin:
   `markdownPaths(collection)` and `markdownFor(context, …)` do the route, so
   all the file says is what belongs in the front matter. Pass `markdown` to
   `BaseLayout` so the page advertises it.
6. **`src/lib/seo.ts`**: a JSON-LD helper for the type, a `SECTIONS` entry for
   breadcrumbs, and `collectionPage(...)` on the index.
7. **`src/lib/collections.ts`**: any shared query the pages both need.
8. **`src/pages/llms.txt.ts`**: a "Start here" line and a section.
9. **`src/pages/llms-full.txt.ts`**: unless the content is republished from
   elsewhere under a share-alike licence.
10. **`src/pages/rss.xml.ts`**: only if the type belongs in the feed.
11. **`astro.config.mjs`**: a sitemap `serialize` rule if it needs a priority.
12. **Tests**: a `data-test` hook if it has behaviour, a contract assertion in
    `tests/build.test.mjs`, and this file updated.

If you find yourself doing this a third time, that is the moment to build the
abstraction, not before. With five collections, the list is cheaper than the
framework.

---
