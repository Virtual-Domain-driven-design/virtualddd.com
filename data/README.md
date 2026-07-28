# data/

Committed inputs that the build reads, and one file the sync writes back.
**None of them are safe to delete.**

| File | What it is |
|---|---|
| `live-urls.txt` | The URL contract: every one of the 967 public addresses this site promises to answer. `npm run check:urls` proves each is served, redirected once, or 410 Gone. |
| `legacy-redirects.csv` | 35 redirect rules inherited from the site's earlier redirect table, folded into the generated `.htaccess`. |
| `videos-inventory.csv` | 536 video addresses with their YouTube IDs, kept so that section can return later **at the same URLs**. |
| `seo-copy.csv` | Titles and descriptions authored in bulk, pushed to Notion by `npm run seo`. Notion stays the source of truth; this is the review surface. |
| `guest-profiles.csv` | Speaker bios and links harvested from session descriptions, pushed by `npm run guests:profiles`. Fills empty Notion fields only. |
| `guest-bio-removals.md` | Source paragraphs still duplicated between a session description and a guest bio, listed for a human to approve before anything is deleted from Notion. |
| `session-guests.csv` | The one-time extraction that created the guest rows. Kept as the record of where those links came from. |
| `sync-alerts.json` | The one **generated** file here: what the last sync wants a person to decide. It is committed on purpose — `sync.yml` raises an alert only when this file's own diff says it is new, so an ignored or uncommitted copy means no alert is ever raised. Resolving something empties it. |

If a file here looks like a leftover, read AGENTS.md → "The URL contract" before
touching it. Losing `live-urls.txt` means losing the ability to prove the site
still answers the addresses people have bookmarked.
