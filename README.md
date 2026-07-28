# virtualddd.com

The website of **[Virtual DDD](https://virtualddd.com)**, a small, volunteer-run
online community around Domain-Driven Design, software architecture and design.

**The community itself lives on [Discord](https://discord.gg/tRJkcsFDKN).** That
is where the talks, the questions and the people are. It is the best place to
start if you want to help with anything below.

**What the site publishes:** live online **sessions** you can RSVP to and watch
back, **open spaces**, **stories** on facilitating software architecture and
design, a curated collection of **heuristics**, and community tools republished
from the **[ddd-crew](https://github.com/ddd-crew)**.

**What is in this repository:** the code that builds the site, plus a committed
copy of its content. The content itself is written in **Notion**, not here.

## What are you here for?

| You want to | Go to |
|---|---|
| Join a session, ask a question, meet people | [Discord](https://discord.gg/tRJkcsFDKN) |
| Speak at a session, or suggest a topic | [Discord](https://discord.gg/tRJkcsFDKN), and say hello to an organiser |
| Write a story, add a speaker bio, fix a typo | [Improve the content](#improve-the-content-no-code-needed) |
| Fix something broken, or improve a page | [Work on the site](#work-on-the-site) |
| Understand how the whole thing fits together | [AGENTS.md](./AGENTS.md) |

## Improve the content (no code needed)

Most of what would make this site better is writing, and none of it happens in
this repository. **Notion is the source of truth.** Everything under
`src/content/` is generated from it, and a change made here is overwritten by
the next sync.

Ask an organiser on [Discord](https://discord.gg/tRJkcsFDKN) for access, then
pick something up:

- **Speaker bios.** A guest with a `Bio` gets a proper block on the session
  page instead of only a name under the title. Most guests have none, which
  makes this the easiest real improvement available.
- **Sessions.** The write-up afterwards, the recording, who spoke. A session
  shows as *upcoming* while its `Datetime` is in the future and moves to the
  archive by itself. Nobody flips a switch for that.
- **Stories, heuristics, open spaces.** Set `Status = Published` and they
  appear on the next sync.
- **Organisers.** Who runs what, and the portrait used across the site.

### Four things to know before you edit

**A slug is a promise.** Changing one changes a public address that other
people have linked to. Rename anyway when it is right, because the sync writes
the redirect itself, but know that it happened.

**Unpublishing is not the same as retiring.** If a page's address is one the
site has promised to answer, unpublishing *keeps it live* and raises it in
Discord rather than quietly breaking the link. Tick **`Retire URL`** when you
mean the page is gone for good.

**Pictures must be Notion files**, not links to somewhere else. A linked image
is somebody else's uptime. When the old WordPress site was switched off, eight
organiser photos pointed at it and stopped existing.

**Nothing you do can break the site silently.** A page published without a
slug, an address still served after its page went away, an image whose source
has gone: each one is posted to Discord, because only an editor can decide what
should happen next.

## Work on the site

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # the blocking suite, about 80 seconds
```

You do **not** need a Notion token to build, test or work on the site, because
the content is committed. A token is only needed to pull fresh content, and
organisers have one.

Issues and pull requests are welcome. This is a community site and it is meant
to be improved by the community. **Feature ideas belong on the Virtual DDD ToDo
board in Notion** rather than here; issues are for what is broken or unclear.
If you are not sure which a thing is, ask on
[Discord](https://discord.gg/tRJkcsFDKN) and somebody will know.

**Read [AGENTS.md](./AGENTS.md) before changing anything.** It is the working
brief, and it is short: the rules that must not be broken, and a map of where
the detail lives. It is written to be read by a person or by a coding agent, so
use whichever agent you like. They all read the same file.

Two rules shape most decisions:

- **The brand is the fixed point.** Layout, copy and structure are open to
  improvement. The visual identity is not up for redesign.
- **URLs are promises.** The site answers every address the old site answered,
  many of them linked from elsewhere. `npm run check:urls` proves each one is
  served, redirected once, or deliberately Gone, and CI will not let you break
  that.

If something goes wrong and you are not sure where to look, AGENTS.md has a
[table of symptoms](./AGENTS.md#when-something-goes-wrong).

### Commands

Everyday:

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serve the built site |
| `npm test` | The blocking suite: unit rules, build, URLs, browser |
| `npm run test:quick` | Unit rules and contracts only, for a fast loop |

Less often:

| Command | What it does |
|---|---|
| `npm run test:full` | The browser suite over every page rather than a sample |
| `npm run test:content` | What an editor could improve. Never fails a deploy |
| `npm run check:urls` | Assert every inherited URL is served, redirected or Gone |
| `npm run redirects` | Regenerate `public/.htaccess` from the inventories in `data/` |

Organisers only, since these need a Notion token or a deployed host:

| Command | What it does |
|---|---|
| `npm run sync` | The whole content pipeline: Notion, then the ddd-crew repositories |
| `npm run sync:<name>` | One collection, for a targeted run |
| `node scripts/verify-live.mjs <url> --all` | Ask a deployed host about every address, about 20 minutes |

## How it gets to the web

```
Notion ──► sync (hourly, or on publish) ──► build + test ──► release ──► Discord
```

An hourly job pulls Notion, commits whatever changed, and deploys it. A typo
fixed in Notion is live within the hour. Publishing a session is the exception,
because it is the one thing worth not waiting for: setting `Status = Published`
sends an event, and the session is live in about ninety seconds.

Tests gate the deploy, so if they fail the previous release stays up. Releases
are atomic, so nobody ever sees a half-written site and rolling back is one
command. Once a week the deployed site is asked whether it still answers every
address it promises, and how long its certificate has left.

If every automated part of that breaks, publishing degrades to a script and a
commit:

```bash
npm run sync     # needs NOTION_TOKEN in local.env
npm test
git commit -am "Content: …" && git push
```

That fallback is a deliberate constraint rather than an accident. Nothing in
the chain is allowed to become the only way to publish. The reasoning, and what
each part does when it fails, is in [docs/pipeline.md](./docs/pipeline.md).

## Licence

Split on purpose. See [LICENSE-CONTENT](./LICENSE-CONTENT) for the detail.

| | |
|---|---|
| Code | [MIT](./LICENSE) |
| Content under `src/content/` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `src/content/ddd-crew/` | CC BY-SA 4.0, **© the [ddd-crew](https://github.com/ddd-crew) and its contributors**, republished with attribution, canonical upstream |
| Photographs and brand assets | All rights reserved, ask first |
