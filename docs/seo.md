# SEO, structured data and AI legibility

How the site describes itself to search engines and to answer engines. Read
this before touching titles, descriptions, JSON-LD or the llms files.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# SEO and structured data

Structured data (JSON-LD) is **generated** from properties we already hold,
never hand-authored in Notion. It lives in `src/lib/seo.ts`, one helper per
kind (`sessionJsonLd`, `storyJsonLd`, `heuristicJsonLd`, `person`,
`organization`, `heuristicSet`) so a type is described the same way wherever it
appears, and `BaseLayout` emits the single `@graph` it is handed.

**Coverage is every page but `/410/`**, which is an error body. Detail pages get
their type, index pages a `CollectionPage` whose `ItemList` is what they list,
standalone pages a plain `WebPage`. **Every page except the home page
carries a `BreadcrumbList`**, built from `SECTIONS` in the same file so a crumb
cannot call a section something the navigation does not.

**A heuristic is a `DefinedTerm`, not an article.** It is a named,
self-contained rule with an author, the most quotable thing on the site, so
each is a term in the `DefinedTermSet` that `/heuristics/` declares, paired with
the `WebPage` that explains it. The term carries what another system would cite;
the page carries the authors, the tags, the `relatedLink` graph to sibling
heuristics, and the term's `subjectOf` links to the sessions and stories that
discussed it.

**House style for titles and descriptions.** Detail pages carry no brand suffix
(see `pageTitle`), so the budget is ~60 characters for a title and 150–160 for a
description, because search results truncate around there and a suffix costs 15
characters of actual topic on every page. Indexes keep the suffix, because
"Heuristics" alone says nothing.

Write an `SEO Title` only where the natural title runs long or is opaque; a
field that duplicates its own fallback is a second copy to maintain.
Descriptions are en-GB, lead with the concrete situation or the person, and
never open with "Learn how to…". A blank field is a legitimate choice, because
the fallbacks are good: a session falls back to a trimmed excerpt of its
abstract, a heuristic to the opening sentence of its body, which *is* the
heuristic.

---

# The sitemap, and proving the site is ours

`@astrojs/sitemap` writes `/sitemap-index.xml` at build time, and `robots.txt`
points at it. Two things are deliberately kept out: `/410/`, which is the body
of an error response rather than a page, and the three heuristic type indexes,
which are filtered views of `/heuristics/` and would read as duplicates. The
filter lives in `astro.config.mjs` next to the `changefreq` rules, so both
decisions are one file.

**There is no `lastmod`, on purpose.** A date that is not demonstrably accurate
is worse than no date, and the recrawl signal that actually matters here is the
redirect map, not a timestamp.

**Google owns the domain property through DNS.** A
`google-site-verification=…` TXT record sits on `virtualddd.com` at the
registrar. It predates the move off WordPress, which is why the cutover did not
cost us the Search Console history: a domain property is verified against DNS,
not against whatever is serving the site that week. Do not remove that record
when tidying DNS.

**Bing is not claimed, and that is a choice rather than an oversight.** It
would mean another login to hold and another account to keep in someone's
hands, which is a real cost for a team this size. If it is ever worth doing,
import the property from Search Console: that needs nothing in this repository,
and no second token to rotate. Prefer it over the `msvalidate.01` meta tag and
the `BingSiteAuth.xml` file, both of which put a credential in the build output
that this site has no reason to carry.

**Expect coverage churn, and do not panic at it.** The site inherited 967
addresses, of which 261 return `410 Gone` on purpose. In a coverage report that
is indistinguishable from a migration gone wrong, and it will surface weeks
after the fact. The split is in [urls.md](urls.md) and is proved every week by
`watch.yml`; the 410s are correct.

---

# AI legibility

The site is meant to be read, cited and quoted by answer engines as well as
people. `robots.txt` allows `GPTBot`, `ClaudeBot`, `PerplexityBot`,
`Google-Extended` and `CCBot` by name, and says why in the file.

Three surfaces, in ascending order of appetite:

- **`/llms.txt`**: the table of contents: every session, story, heuristic, tool
  and open space, one line each, with the guests on a session because "who spoke
  about X" is what an archive of talks gets asked.
- **`<page>/index.md`**: the markdown behind any content page,
  advertised with `<link rel="alternate" type="text/markdown">`. Front matter
  names the source URL, the author and the date; then the words, with no nav to
  strip. `src/lib/markdown-page.ts` builds it, and `.htaccess` carries the
  `AddType` so the host does not serve it as a download.
- **`/llms-full.txt`**: the whole corpus in one request, ~500 KB.
  **ddd-crew is deliberately excluded**: it is republished under CC BY-SA with
  its canonical upstream, so folding it into a file that reads as ours would be
  the wrong thing to do with a share-alike licence.

None of this is a separate artefact to maintain. It is all generated from the
markdown the sync already writes, which is why it is nearly free.

---
