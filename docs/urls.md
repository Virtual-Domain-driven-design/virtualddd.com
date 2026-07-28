# The URL contract

The part to be most careful with. Read this before renaming a slug, deleting
a page, or touching redirects.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# The URL contract

**This is the part to be most careful with.** The site answers every address
the old site answered. Many of them predate the current build and are still
linked from search results, newsletters and other people's blog posts. That
contract is worth more than any code in this repository.

Every address is handled one of three ways. `data/live-urls.txt` is the list,
and this is the only place the split is written down, so an inventory change is
one edit here rather than a hunt through the prose.

| Handling | Count | Meaning |
|---|---|---|
| Served | 294 | The page exists at that address |
| Redirected | 412 | One hop, to a page that exists |
| Gone | 261 | Retired on purpose, so search engines drop them cleanly instead of showing a soft 404 for years |

`public/.htaccess` is **generated**. Edit `scripts/build-redirects.mjs`, never
the output. Its inputs are committed on purpose and **must not be deleted**:

- `data/live-urls.txt`: the full inventory of addresses.
- `data/videos-inventory.csv`: every video URL with its YouTube ID, so that
  section can return later **at the same URLs**.
- `data/legacy-redirects.csv`: the rules inherited from the old redirect table.

`npm run check:urls` proves every one of them is served, redirected or Gone,
with no chains, and fails the build otherwise. Two rules are deliberately
commented out: `/papers/` and `/books/` become 301s to `/reading-list/` the day
that page ships.

`ErrorDocument` points at two branded pages: `/404.html` and `/410/`. Without
them the host serves its own: an unbranded 404 with no way back, and a bare
"Gone" for the addresses retired on purpose.

**When an editorial change retires a URL**, a merged duplicate or a renamed
slug, the page stops existing on the next sync and `npm run check:urls` says
so. Add
the old → new pair to `RETIRED` in `scripts/build-redirects.mjs`.

**One hostname.** `www.virtualddd.com` redirects to the bare domain. It is
first in the generated `.htaccess`, so it costs a single hop rather than a path
redirect on the wrong host followed by another.

> WordPress did this and a static site does not, so for a few hours after the
> cutover every page had two addresses that both answered 200. No inherited
> address is a www one, which is why `check-redirects.mjs` skips
> host-conditional rules: replaying that rule's `^(.*)$` against the inventory
> would match every URL in it and prove nothing. The real server is asked
> instead, by `verify:live`.

Other standing rules:

- `trailingSlash: 'always'`. Every internal link ends in a slash; a test
  enforces it, because the alternative is a 301 on every click.
- **A slug is a promise.** Changing one changes a URL and needs a redirect.
- Never remove a page without deciding whether its address should redirect or
  return Gone.

---
