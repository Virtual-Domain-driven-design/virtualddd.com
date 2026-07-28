# data/

Committed inputs that the build reads, and one file the sync writes back.
**None of them are safe to delete.**

| File | What it is |
|---|---|
| `live-urls.txt` | The URL contract: every one of the 967 public addresses this site promises to answer. `npm run check:urls` proves each is served, redirected once, or 410 Gone. |
| `legacy-redirects.csv` | 35 redirect rules inherited from the site's earlier redirect table, folded into the generated `.htaccess`. |
| `videos-inventory.csv` | 536 video addresses with their YouTube IDs, kept so that section can return later **at the same URLs**. |
| `sync-state.json` | **Generated.** What the last sync saw, per page: the slug, Notion's `last_edited_time` and a digest of the body written. It is what makes the sync incremental and what notices a generated file edited by hand. |
| `sync-alerts.json` | **Generated.** What the last sync wants a person to decide. Committed on purpose — `sync.yml` raises an alert only when this file's own diff says it is new, so an ignored or uncommitted copy means no alert is ever raised. Resolving something empties it. |

Four files, and every one of them is load-bearing. The bulk-authoring CSVs that
used to live here — `seo-copy.csv`, `guest-profiles.csv`, `session-guests.csv` —
were removed once their copy was in Notion: a committed snapshot that pushes
*into* the source of truth goes stale the moment an editor improves something,
and nothing in the tool can tell. They are in the history if the workings are
ever wanted.

If a file here looks like a leftover, read AGENTS.md → "The URL contract" before
touching it. Losing `live-urls.txt` means losing the ability to prove the site
still answers the addresses people have bookmarked.
