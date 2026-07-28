# virtualddd.com

The website of **[Virtual DDD](https://virtualddd.com)** — a small, volunteer-run
online community around Domain-Driven Design, software architecture and design.

It publishes live online **sessions** you can RSVP to and watch back, **open
spaces**, **stories** on facilitating software architecture and design, a
curated collection of **heuristics**, and community tools republished from the
**ddd-crew**.

A static [Astro](https://astro.build) site. The content lives in **Notion**, is
synced into `src/content/` as markdown, and is committed here — so the site
builds offline, every content change is a reviewable diff, and publishing never
depends on an API being up.

## How it gets to the web

```
Notion ──► sync (hourly, or on publish) ──► build + test ──► release ──► Discord
```

- **Editing rides the clock.** An hourly job pulls Notion, commits whatever
  changed, and deploys it. A typo fixed in Notion is live within the hour, and
  an hour in which nobody edits deploys nothing at all.
- **Publishing a session is the exception**, because it is the one thing worth
  not waiting for: setting `Status = Published` sends an event, and the session
  is live in about ninety seconds.
- **Tests gate the deploy.** If they fail, the previous release stays up — a
  stale site is better than a broken one.
- **Releases are atomic.** Each one is copied to the host in full and the live
  site is switched to it at the end, so nobody ever sees a half-written site,
  and rolling back is one command.
- **Once a week** the deployed site is asked whether it still answers all 967
  addresses it promises, and how long its certificate has left.

If every automated part of that breaks, publishing degrades to **a script and a
commit** — see [Fallback](#fallback). That is a deliberate constraint rather
than an accident: nothing in the chain is allowed to become the only way to
publish.

## Helping with the content — no code needed

Most of what would make this site better is writing, and none of it happens in
this repository. **Notion is the source of truth**; everything under
`src/content/` is generated from it, and a change made here is overwritten by
the next sync.

Ask an organiser for access, then:

- **Sessions** — the write-up afterwards, the recording, who spoke. A session
  shows as *upcoming* while its `Datetime` is in the future and moves to the
  archive by itself; nobody flips a switch for that.
- **Session guests** — a speaker with a **`Bio`** gets a proper block on the
  session page instead of only a name under the title. Most guests have none,
  which makes this the easiest real improvement available.
- **Stories, heuristics, open spaces** — set `Status = Published` and they
  appear on the next sync.
- **Organisers** — who runs what, and the portrait used across the site.

Four things worth knowing before you edit:

1. **A slug is a promise.** Changing one changes a public address other people
   have linked to. Rename anyway when it is right — the sync writes the
   redirect itself — but know that it happened.
2. **Unpublishing is not the same as retiring.** If a page's address is one the
   site has promised to answer, unpublishing *keeps it live* and raises it in
   Discord instead of quietly breaking the link. Tick **`Retire URL`** when you
   mean it is gone for good.
3. **Pictures must be Notion files**, not links to somewhere else. A linked
   image is somebody else's uptime: when the old WordPress site was switched
   off, eight organiser photos pointed at it and stopped existing.
4. **Nothing you do can break the site silently.** A page published without a
   slug, an address still served after its page went away, an image whose
   source has gone — each is posted to Discord, because only an editor can
   decide what should happen next.

## Helping with the site — code

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # the blocking suite (~80s): unit rules, build, contracts, browser
```

You do **not** need a Notion token to build, test or work on the site — the
content is committed. A token is only needed to pull fresh content, and
organisers have one.

Issues and pull requests are welcome; this is a community site and it is meant
to be improved by the community. **Feature ideas belong on the Virtual DDD ToDo
board in Notion** rather than here — issues are for what is broken or unclear.

**Read [AGENTS.md](./AGENTS.md) first.** It is the working brief: the content
model, the URL contract, how the pipeline fits together, the conventions, and
what each test is protecting. It is written to be read by a person or by a
coding agent — use whichever agent you like, they all read the same file.

Two things to know before changing anything:

- **The brand is the fixed point.** Layout, copy and structure are open to
  improvement; the visual identity is not up for redesign.
- **URLs are promises.** The site answers 967 addresses, many linked from
  elsewhere. `npm run check:urls` proves every one is served, redirected once,
  or deliberately Gone, and CI will not let you break that.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Static build to `dist/`, then drops the unreferenced originals Astro emits alongside its `.webp` |
| `npm run preview` | Serve the built site |
| `npm test` | The blocking suite: unit rules, build, URL contract, browser behaviour |
| `npm run test:quick` | Unit rules and contracts only, for a fast loop |
| `npm run test:full` | The browser suite over every page rather than a sample |
| `npm run test:content` | The reporting suite: what an editor could improve. Never fails a deploy |
| `npm run sync` | The whole content pipeline: Notion, then the ddd-crew repositories |
| `npm run sync:<name>` | One collection, for a targeted run |
| `npm run redirects` | Regenerate `public/.htaccess` from the inventories in `data/` |
| `npm run check:urls` | Assert all 967 inherited URLs are served, redirected or Gone |
| `npm run seo` | Push `data/seo-copy.csv` into Notion (`--write` to apply) |
| `npm run guests:profiles` | Push `data/guest-profiles.csv` into the guests database |
| `node scripts/verify-live.mjs <url> --all` | Ask a deployed host about all 967 addresses (~20 min). Called directly because `npm run` swallows the `--all` |

### Fallback

If the automation is down, publishing is still three commands. This is meant to
keep working, and is worth trying occasionally so that it does:

```bash
npm run sync     # needs NOTION_TOKEN in local.env
npm test
git commit -am "Content: …" && git push
```

## Licence

Split, on purpose — see [LICENSE-CONTENT](./LICENSE-CONTENT) for the detail.

| | |
|---|---|
| Code | [MIT](./LICENSE) |
| Content under `src/content/` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `src/content/ddd-crew/` | CC BY-SA 4.0, **© the [ddd-crew](https://github.com/ddd-crew) and its contributors** — republished here with attribution, canonical upstream |
| Photographs and brand assets | All rights reserved — ask first |
