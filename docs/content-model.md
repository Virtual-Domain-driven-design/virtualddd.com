# How the content is modelled

Collections, the two people databases, what makes a page publish, and how
relations behave. Read this before adding a field, adding a collection, or
wondering why guests and organisers are kept apart.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# Content model

**Notion is the source of truth.** Everything under `src/content/` is
**generated** by the sync scripts and **never hand-edited**. It is committed on
purpose: content history in git, offline builds, and diffs you can review.

| Collection | Notion data source (`collection://…`) |
|---|---|
| sessions | `33e9db0a-1418-4a3e-a053-33fa384e5e93` |
| open-spaces | `0cfb73c7-a638-4948-a4df-5fe06dcd2dd1` |
| stories | `25aa485a-fafc-8047-94b7-000b3bbb228c` |
| heuristics | `e7743290-3850-404e-ae98-23a4caf0488e` |
| organisers | `cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6` |
| session guests | `d82910e0-cac0-46f8-8a20-cb3a3376d5eb` |

ddd-crew content comes from GitHub, not Notion (`npm run sync:ddd-crew`).

## Two people databases, deliberately

- **Organisers** drive `/organisers/` and are the target of a session's
  `Organiser` / `Co-Organisers`. This is an *operational* database: Discord
  accounts, community email, who runs what.
- **Session Guests** are the speakers and panellists. None of those operational
  fields apply to an external speaker, so they do not live in the organisers
  database. The fields here exist to produce good `Person` structured data, and
  the links become `sameAs`.

The cost is that someone who both organises and speaks has a row in each. That
is deliberate, and `Also an organiser` marks it. The alternative, one people
table with a flag, was rejected because it would put 60+ external speakers into
the database the community is actually run from. On the site the two rows are
rejoined by name (`samePerson` in `src/lib/people.ts`): a guest who matches an
organiser links to that organiser page and borrows its portrait, so nothing is
typed twice.

**A guest has no slug, no page and no role field.** The entry file is named
`kebab(name)` purely so a session's `guests` relation resolves; it is never a
URL, so renaming a guest in Notion is free. What someone does belongs in their
bio ("Matthew is the co-author of Team Topologies") rather than in a field
beside it:
one field is one thing for an editor to fill in, and it reads as a sentence
rather than a job title.

Guests render at two levels:

- **Every** session with guests names them under the title, `Guests: A, B`,
  which is the question a reader arrives with.
- A guest with a **`Bio`** (and a portrait, if there is one) gets a block below
  the description. No bio, no block; write one in Notion and it appears on the
  next sync. `npm run test:content` reports guests on *upcoming* sessions who
  have none.

Either way they are `performer` on the session's `Event`, so the structured data
never depends on how much bio anyone got round to writing.

Bios are written **in Notion**. The first 19 were harvested from session
descriptions and pushed in bulk from a committed CSV; that CSV and its script
are gone, because a snapshot that pushes into the source of truth is wrong the
moment somebody improves the copy there, and nothing in the tool can tell. If
another bulk pass is ever wanted, `git log -- data/guest-profiles.csv` has the
workings.

## Publish gates (per database, not global)

- **Sessions** render in two states, derived from `Datetime`, not from a manual
  flip: `Status = Published` + a future `Datetime` → **upcoming** (RSVP);
  `Status = Done` → **past archive** (recording, notes). `Ended` is an optional
  internal "awaiting post-production" marker the site ignores.

  The upcoming→past transition is **client-side**. Pages that lead with a
  session render *every* upcoming session, soonest first, all but the first
  hidden; the `js-next` sweep in `BaseLayout` picks the first that has not
  finished and re-checks every minute. So the passage of time never needs a
  rebuild. A session stays "next" for `SESSION_GRACE_MS` (3 hours, in
  `src/lib/upcoming.ts`) after its start, because someone arriving late wants
  today's join link rather than next month's RSVP. That is the same window the
  `.js-live`
  links use. The rule lives in one place because it runs twice, at build and in
  the browser; `tests/unit/upcoming.test.mjs` is its specification.

- **Open spaces, stories, heuristics**: `Status = Published`.
- Only rows passing their gate produce files.

## Relations

Model them as Astro `reference()` and let the build fail on a dangling link
rather than dropping it silently. The sync distinguishes two cases and says
which: a heuristic that exists but is still being curated (normal, and the link
appears when it is published) versus a relation pointing at a page that is not
in the database at all (a real dangling reference; `--strict` fails on it).

---

# ddd-crew content

Mostly CC BY-SA 4.0 (share-alike). Attribution to each repo and its contributors
is **mandatory**, in the layout rather than per page, with a link to the licence.
`rel=canonical` points upstream, since `ddd-crew.github.io` already publishes
these. The licence and the credit are in the structured data and in each page's
markdown too, so they survive being read without the HTML.

---
