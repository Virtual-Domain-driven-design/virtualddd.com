# Testing

What each layer is for, what the tests are protecting, and the difference
between a test that blocks a deploy and one that reports. Read this before
adding or changing a test.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# Testing

**Test the promises, not the pixels.** A promise is something a third party
depends on and that breaks silently: a URL, a redirect, a feed, a canonical, a
JSON-LD shape, "this page works with JavaScript off", "the next session is the
next one". Those get hard tests. Layout, copy and components are what we are
still deliberately changing, so tests must not pin them down.

## The test surface

Tests select **only** `[data-test]` hooks and `js-*` behaviour classes. Never a
styling class, never an id the CSS also targets, never visible copy. A restyle
then cannot break a behaviour test, which is what makes design work cheap to
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

## Blocking vs reporting

The suite sits on the publish path, so **a test an editor can turn red from
Notion must not stop a deploy.** That would make publishing hostage to CI.

- **Blocking** (`npm test`): unit rules, `astro check`, the build, contract
  assertions over `dist/`, the redirect map, browser behaviour. If one fails the
  site is broken; do not deploy.
- **Reporting** (`npm run test:content`): duplicate titles, missing
  descriptions, glued links, stories with no author, guests with no bio on an
  upcoming session. Real defects, but they belong to whoever holds the Notion
  page. Read them and fix them in Notion; do not gate the deploy on them.

`npm run test:all` runs both.

## The five layers, cheapest first

1. **`tests/unit/*`** (`npm run test:unit`): pure rules, no build, no browser,
   under a second. Run with `--import tsx`, since they import the TypeScript
   directly. `notion-md` (what every generated page says), `upcoming` (which
   session is next), `card-filter` (which cards a filter leaves showing),
   `people` (whether two names are one person, which decides whose photograph
   appears), `seo` (every structured-data decision).

   This is the layer to add to when you change a rule. `seo.ts` and
   `card-filter.ts` are unit-tested precisely so they can be rewritten: the
   tests say what the output must still mean, not how the code is arranged.
   `socialCard` lives in its own module for the same reason: it needs
   `astro:assets`, which only exists inside a build, and keeping it out of
   `seo.ts` is what makes `seo.ts` testable at all.
2. **Types and build**: `astro check` (0/0/0) and `npm run build`.
3. **`tests/build.test.mjs`**: assertions over `dist/`: canonicals, OG tags,
   one `<h1>`, internal links, JSON-LD shapes and breadcrumbs, feeds, archive
   ordering, every upcoming session shipped, `.ics` start times, prev/next
   round-tripping, the sitemap, the error pages, the markdown twins, and a size
   ceiling on the deploy.
4. **`tests/urls.test.mjs`**: replays `public/.htaccess` against the
   inventory.
5. **`tests/browser.test.mjs`**: Playwright against the built site: horizontal
   overflow at 360 and 390 px, search and filtering, the next-session sweep and
   countdown **with the clock moved**, local time in a non-UTC timezone,
   carousels, rendering with JavaScript off, accessible names, focus rings.
   `TEST_FULL=1` widens the sample to every page. It also runs **axe-core**
   over one page of each shape, scoped to WCAG 2.1/2.2 A and AA. The audit
   that would have caught the contrast, target-size and heading defects a human
   review had to find by hand.

**`npm run verify:live <url>`** is the one that cannot run locally: it requests
real URLs from a deployed host and checks the status codes, because only the
real server proves the `.htaccess` is honoured, that a 410 is a 410, and that
www comes home in one hop. Every deploy runs it against `SITE_URL`.

It samples one URL family at a time unless told otherwise, and **`npm run` eats
the flag**. For every address, call the script directly:

```bash
node scripts/verify-live.mjs https://virtualddd.com --all   # ~20 minutes
```

Not covered, deliberately: visual regression (no baseline worth maintaining for
a site still being designed), Lighthouse (run by hand before a release), and
link checking of external URLs (they rot for reasons outside this repo).

---
