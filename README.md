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

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # the blocking suite: unit rules, build, contracts, browser
```

You do **not** need a Notion token to build, test or work on the site. The
content is committed. A token is only needed to pull fresh content from Notion,
and organisers have one.

## Publishing

The everyday loop is not this repository:

1. Edit the content in **Notion**
2. `npm run sync` — pulls Notion and the ddd-crew repos into `src/content/`
3. `npm test`
4. Commit and push

That is also the fallback if the automation ever breaks: **a script and a
commit always produce a correct deploy**, which is a deliberate constraint
rather than an accident.

## Contributing

Issues and pull requests are welcome — this is a community site and it is meant
to be improved by the community.

**Read [AGENTS.md](./AGENTS.md) first.** It is the working brief: what the site
is for, the guardrails, the URL contract, how the content model works, and what
the tests are protecting. It is written to be read by a person or by a coding
agent — use whichever agent you like, they all read the same file.

Two things worth knowing before you change anything:

- **The brand is the fixed point.** Layout, copy and structure are open to
  improvement; the visual identity is not up for redesign.
- **URLs are promises.** The site answers close to a thousand addresses, many of
  them linked from elsewhere. `npm run check:urls` proves every one is served,
  redirected once, or deliberately Gone.

## Licence

Split, on purpose — see [LICENSE-CONTENT](./LICENSE-CONTENT) for the detail.

| | |
|---|---|
| Code | [MIT](./LICENSE) |
| Content under `src/content/` | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| `src/content/ddd-crew/` | CC BY-SA 4.0, **© the [ddd-crew](https://github.com/ddd-crew) and its contributors** — republished here with attribution, canonical upstream |
| Photographs and brand assets | All rights reserved — ask first |
