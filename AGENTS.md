# AGENTS.md, virtualddd.com

The working brief for this repository. Written for **anyone changing this site:
a person, a coding agent, or the two together**. `CLAUDE.md` points here, so
point your own tool here too if it looks for a different filename.

**[README.md](./README.md) is the front door.** It says what the site
publishes, how to run it, and how somebody helps without touching code. Start
there if you have not seen this project before. The everyday loop is *not*
editing this repository, and knowing what it actually is will save you an hour.

This file is the map. It carries the rules that must not be broken, in full,
and points at the detail. Read it and you cannot do damage; read only the
document you need and you can do the work.

## Read this much, at minimum

Each rule says **how we know** it is being kept. That line is not decoration.
A rule with a machine behind it is a constraint; a rule with a person behind it
is a habit, and habits drift silently — rule 5 was already broken by a test
selecting `.card-title`, a styling class, and nothing noticed until somebody
went looking. Assume nothing is checked unless it says so here.

1. **Notion is the source of truth.** Everything under `src/content/` is
   generated and is never hand-edited. CI fails a push that touches it from
   anyone but the sync. See [docs/pipeline.md](docs/pipeline.md).
   *How we know: **machine.** The sync re-fetches any body whose digest changed,
   `deploy.yml` rejects the push, and CODEOWNERS puts a maintainer on the PR.*
2. **URLs are promises.** Every address the old site answered is still served,
   redirected once, or returned as `410 Gone` on purpose. `npm run check:urls`
   is the guard, and it fails the build. Never edit `public/.htaccess`; edit
   its generator. See [docs/urls.md](docs/urls.md).
   *How we know: **machine.** `check:urls` against `dist`, a test that the
   committed `.htaccess` is what the generator would write, and
   `verify-live.mjs` against the deployed host.*
3. **The brand is the fixed point.** Layout, copy, components and structure are
   open to improvement. The colours, the logo and the feel are not.
   See [docs/brand-and-code.md](docs/brand-and-code.md).
   *How we know: **machine, partly.** A browser test measures real contrast on
   brand fills, and `conformance.test.mjs` keeps colour literals out of
   components. Whether something still **feels** like Virtual DDD is a person's
   judgement.*
4. **Propose options, then ask.** For anything that changes what a visitor
   sees, work out what the page and the Notion data actually do, name the
   friction, offer options with a recommendation, and let the maintainers
   decide. Recommend; do not unilaterally redesign.
   *How we know: **a reader, if one is configured.** No check can see an option
   you did not offer, so `review.yml` asks a reviewer to look for it in the diff
   and the commit message. Advisory, non-deterministic, and silent until an
   `ANTHROPIC_API_KEY` exists. Treat it as resting on you.*
5. **Tests select `[data-test]` hooks and `js-*` classes only**, never a
   styling class and never visible copy, so restyling a section cannot break
   them. A check that an editor can turn red from Notion reports; it never
   blocks a deploy. See [docs/testing.md](docs/testing.md).
   *How we know: **machine.** `conformance.test.mjs` reads the test files and
   fails on a selector naming a class the stylesheets define.*
6. **Small steps, section by section.** Improvement is opt-in per section,
   never a big-bang rebuild. Sections ship independently.
   *How we know: **a reader, if one is configured.** `review.yml` prints how
   many lines a push added against how many it deleted, which is the shape of
   the change whether or not a reviewer reads it.*
7. **Improvements can land on either side.** Sometimes the right fix is in the
   Notion schema or the editing workflow rather than in the code. Changing
   Notion is in scope.
   *How we know: **n/a.** A permission, not a constraint.*
8. **Feature ideas go to the Virtual DDD ToDo board in Notion**, not into a
   file in this repository. Code changes go here; wishes go there.
   *How we know: **weakly.** `conformance.test.mjs` fails on a TODO file
   appearing in the repository. It cannot tell whether the idea reached Notion.*

The team is small and time is short. The constraint behind every decision here
is *low ongoing maintenance*.

## Three tiers, and what each one is for

The same shape as the test suite, and for the same reason: what blocks a deploy
must be about code being wrong, never about somebody's writing.

| Tier | Runs | Fails the deploy? |
|---|---|---|
| **Blocking** — contracts, URLs, browser behaviour, **conformance** | Every push | Yes |
| **Conformance** — the rules above that a machine can read | Every push, inside the blocking suite | Yes |
| **Content report** — what an editor could improve | Every push | No, `continue-on-error` |
| **Review** — the diff, against this file | Every push touching code | No — a separate workflow |

`tests/conformance.test.mjs` is where a rule from this file becomes executable.
Every test in it names the rule it enforces. **If you add a rule here, either
add a test there or write "nobody" beside it** — a rule that sounds enforced and
is not costs more than an honest habit, because it gets assumed.

What conformance cannot see is additive bias: a component that should have
reused `TeaserCard`, a helper that duplicates one in `src/lib/`, a fourth way to
render a card. Every one of those is *imported by something*, so every
mechanical check calls it used. It is only visible in a diff, by a reader.

That is `.github/workflows/review.yml`, which follows
[.claude/skills/review-change](.claude/skills/review-change/SKILL.md) — the
procedure, deliberately not a second copy of the rules above. Run the same
review locally with `/review-change` before pushing.

**It reports and does not block, and that is the design.** The reviewer is a
language model; the standing promise in [docs/pipeline.md](docs/pipeline.md) is
that publishing degrades to a script and a commit, never an outage. So a finding
is a red cross on the commit and a message in Discord, and the site still ships.
It is a separate workflow from the deploy for exactly that reason — if it is
ever made blocking, make it a required check, never a step inside `deploy.yml`.

## Where the detail lives

| Read this | Before you |
|---|---|
| [docs/content-model.md](docs/content-model.md) | Add a field, add a collection, or wonder why guests and organisers are separate databases |
| [docs/urls.md](docs/urls.md) | Rename a slug, retire a page, or touch redirects |
| [docs/pipeline.md](docs/pipeline.md) | Change the sync, debug a missing page, or ask why nothing deployed |
| [docs/testing.md](docs/testing.md) | Add or change a test, or find out what one is protecting |
| [docs/brand-and-code.md](docs/brand-and-code.md) | Write CSS, add a component, or add a content type |
| [docs/seo.md](docs/seo.md) | Touch titles, descriptions, structured data or the `llms` files |
| [docs/operations.md](docs/operations.md) | Deploy by hand, roll back, move a domain, or chase a certificate |
| [data/README.md](data/README.md) | Touch anything in `data/` |

Commands are in the [README](./README.md#commands). What a table has no room
for:

- **`npm run build`** also runs `prune-dist.mjs`, which drops the unreferenced
  originals Astro emits alongside its `.webp`. That is around 22 MB a build.
  `dist` is asserted under a 50 MB ceiling, so a silent prune failure surfaces
  as a failing test rather than a slow rsync.
- **`npm run build`** then runs **`pagefind --site dist`**, which indexes the
  built HTML into `dist/pagefind/` for `/search/`. It indexes the *output*, so
  there is no second copy of the content to keep in step — but it also means
  **`astro dev` has no search index**, and `/search/` says so rather than
  looking broken. Two rules decide what is in it, both in the markup:
  `data-pagefind-body` in `BaseLayout` (tied to `noindex`, so a page kept out
  of Google is kept out of ours), and `data-pagefind-ignore` on cards and
  filter bars, because a card is a pointer to a page that is already indexed on
  its own account. Adding ~3 MB, so watch the ceiling above.
- **`npm run sync`** does guests **before** sessions, because sessions
  reference them, and the ddd-crew config **before** the ddd-crew fetch,
  because the config is what says which READMEs to go and get. `--strict` fails
  on a dangling relation. `--full` ignores `data/sync-state.json` and re-fetches
  every body.
- **`npm run sync:podcasts`** is the one step that is never fatal. It asks Apple
  which episode is which so the pages can link to one, and `sync.yml` swallows a
  failure into a warning on purpose: `data/podcast-episodes.json` is committed,
  so a build never needs Apple and a bad afternoon at Apple must not block a
  content commit. Run by hand it still exits non-zero, because a person asking
  for a refresh wants to know it did not happen.
- **`npm run redirects`** must be re-run after adding or renaming content. A
  test fails if the committed `.htaccess` is not what the generator would write
  today.
- **`npm run check:urls`** needs a build first. It checks the rules against the
  pages in `dist/`.

## When something goes wrong

The pipeline tells you rather than waiting to be asked. What lands where:

| Symptom | Where to look |
|---|---|
| A page is published in Notion but not on the site | The **sync** run in GitHub Actions. A page with no slug, or one still quarantined, is reported there and posted to Discord |
| Something in Notion needs a person to decide | **Discord**, from `data/sync-alerts.json`: an unpublished page whose address is still live, a page with no slug, an image whose source has gone, a conference whose dates have been and gone |
| A deploy failed on `Cannot reach the host` | The host's brute-force protection blocked the runner. Re-run the deploy; a different runner has a different IP. Kualo calls it cPHulk |
| CI is red on `main` after a content commit | The sync commits and deploys as separate jobs. Check which one failed before assuming the content is wrong |
| The site is stale but the runs are green | Check the deploy built the commit you expect. The `What is being built?` step prints it |
| Nothing has synced for hours, and no run was even started | The **VirtualDDD hourly sync** workflow in n8n. It keeps the hourly clock, because GitHub's own cron drops and delays scheduled runs on a quiet repository; that cron is only the backstop and *is* expected to run late |
| Nobody knows | Ask on [Discord](https://discord.gg/tRJkcsFDKN). The organisers read it |

Deploy and sync notifications reach Discord through n8n. If a message never
arrives, the run is still the record: the workflow summary says what happened,
whether or not anyone was told.

## The counts

Inventory numbers live in the data, not in prose. `data/live-urls.txt` is the
list of addresses the site promises to answer, and `npm run check:urls` proves
each one is served, redirected or Gone. The exact split is in
[docs/urls.md](docs/urls.md), in one table, so an inventory change is one edit.

## A note on the Notion ids

The database ids in [docs/content-model.md](docs/content-model.md) and in
`scripts/sync-notion.ts` are published on purpose. They identify a database;
they do not grant access to one. Reading anything needs `NOTION_TOKEN`, which
is a repository secret and is not in this repository.
