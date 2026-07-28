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
