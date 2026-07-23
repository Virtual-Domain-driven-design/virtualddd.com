# CLAUDE.md — virtualddd.com

Operating brief for Claude Code. Read this before acting. The phase-by-phase
plan lives in `MIGRATION.md`; this file is the standing context that plan
assumes.

## What this is

virtualddd.com is the site of **Virtual DDD**, a small, volunteer-run online
community around Domain-Driven Design, software architecture and design. It
publishes live online **sessions** (meetups people RSVP to, then watch back),
**open spaces**, **stories** on facilitating software architecture & design,
curated **heuristics**, and republished **ddd-crew** community content.

It is being migrated from WordPress to a **static Astro site** sourced from
**Notion**, built in CI, and deployed to **Kualo** over SSH. Small team, little
time: the whole point is less ongoing maintenance than WordPress demanded.

## How we work (read this — it shapes every change)

- **Not a 1:1 port.** The one fixed point is the **branding** — the existing
  visual identity is preserved throughout. Everything else may be improved.
- **Section by section, as-is first, then improve in small steps** where it
  makes sense. Improvement is opt-in per section, never a big-bang rebuild.
  Sections ship independently.
- For each section, act as **UI designer *and* software engineer**: analyse
  what the live site and the Notion data/workflow actually do, surface the
  friction, then **propose options and ask before building**. Recommend, but
  let the maintainers decide.
- **Improvements can land on either side** — the Notion schema/workflow or the
  website — whichever removes the real friction. Improving Notion is in scope,
  not just rendering what's there.

## Content model

**Notion is the source of truth.** Markdown under `src/content/` is
**generated** by the sync scripts and **never hand-edited**. Commit the
generated markdown (content history in git, offline builds, reviewable diffs).

Collections and their Notion data sources (verified schemas):

| Collection | Notion data source (`collection://…`) | Slug | SEO fields |
|---|---|---|---|
| sessions | `33e9db0a-1418-4a3e-a053-33fa384e5e93` | none — add it | none — add them |
| open-spaces | `0cfb73c7-a638-4948-a4df-5fe06dcd2dd1` | none — add it | none — add them |
| stories | `25aa485a-fafc-8047-94b7-000b3bbb228c` | `slug` (+ `full slug` formula) | `SEO Title`, `SEO Metadescription`, `Focus keyphrase` |
| heuristics | `e7743290-3850-404e-ae98-23a4caf0488e` | `Slug` | `Meta Description`, `Focus Keyphrase` |

People relation target (Sessions `Organiser`/`Co-Organisers`):
`collection://cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6`.

**Videos are out of scope.** The Notion Videos database and its ~536 live URLs
are not authored here; they get a redirect/archive decision in `MIGRATION.md`
Phase 6, not a collection.

### Publish gates (per database — not global)

- **Sessions** render in two states, derived from `Datetime`, not a manual
  flip: `Status = Published` + future `Datetime` → **upcoming** (RSVP);
  `Status = Done` → **past archive** (with recording/notes). The
  upcoming→past transition is **client-side** by date; no rebuild needed for
  the passage of time. `Ended` is an optional internal "awaiting
  post-production" marker the website ignores. The `Video` (YouTube) link is
  usually present from `Published` on.
- **Open spaces / stories / heuristics**: `Status = Published`.
- Only rows passing their gate produce files. Reconcile counts after syncing
  (Sessions archive ≈ 108; verified 107 are `Done`).

### Slugs and URLs (SEO is a hard requirement)

- Existing URLs must stay reachable. **Preserve, don't just redirect.** The
  `slug` property is authoritative and is **backfilled from the existing
  WordPress URL** (match Sessions by `Name` + `Wordpress Published date`
  against the live sitemap). Slugs are editorial thereafter; changing one is a
  URL change needing a redirect.
- `trailingSlash: 'always'` in `astro.config.mjs` matches WordPress; do not
  change it without a redirect plan.
- When adding SEO fields to Sessions/Open Spaces, **reuse the Stories naming**
  (`slug`, `SEO Title`, `SEO Metadescription`) — do not invent a third
  convention. Structured data (JSON-LD) is **generated** from existing
  properties, never hand-authored in Notion.
- Relations: model as Astro `reference()` and let the build fail on a dangling
  link rather than dropping it silently.

## Brand

Existing visual identity is preserved; the CSS is rebuilt against tokens
extracted from the live site (`src/styles/tokens.css`). Divi markup is not
portable — do not port it, rebuild against tokens.

## ddd-crew content

Mostly CC BY-SA 4.0 (share-alike). Attribution to each repo and its
contributors is **mandatory**, in the layout not per page, with a link to the
licence. Set `rel=canonical` to the upstream repo / existing published version,
since `ddd-crew.github.io` already publishes these.

## Deploy

- Build in **CI only**, never on Kualo. Deploy `dist/` to Kualo over SSH.
- The pipeline (Notion → n8n → GitHub Actions → rsync; social via post-deploy
  webhook) is **automation over a manual process**. Running the sync script and
  `git push` by hand must always produce a correct deploy. If the automation
  breaks, publishing degrades to a script and a commit — never an outage.

## Commands

- `npm run dev` — local dev server
- `npm run build` — static build to `dist/`
- `npm run preview` — serve the built site
