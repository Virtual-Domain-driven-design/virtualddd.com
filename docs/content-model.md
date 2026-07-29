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
| conferences | `c5b9e231-6766-4589-a179-c70d20db3e34` |

ddd-crew content comes from GitHub, not Notion (`npm run sync:ddd-crew`).

## Two people databases, deliberately

- **Organisers** drive `/organisers/` and are the target of a session's
  `Organiser` / `Co-Organisers`. This is an *operational* database: Discord
  accounts, community email, who runs what.
- **Session Guests** are the speakers and panellists. None of those operational
  fields apply to an external speaker, so they do not live in the organisers
  database. The fields here exist to produce good `Person` structured data, and
  the links become `sameAs`.

**Stories use both, and the names are not decoration.** A story's `Guests`
points at the same guests database as a session, and its `Hosts` at the
organisers, so someone who has told a story and spoken at a session is one row
with one bio. **Order is the meaning**: the first guest is the one whose story
it is, and two episodes in the archive are the same pair the other way round.
An episode with no outside guest is hosts only; on those the hosts are the
`author` in the structured data rather than `contributor`, because it is their
story being told and not an interview.

The byline says **"by the guest, with the hosts"**, because one flat list of
names says neither who told the story nor who asked the questions.

**Unlike a session, a story shows its guest block whether or not there is a
bio.** Sessions hide a bio-less guest because the organiser is the constant and
the guest is the extra. On a story it is the other way round: the guest is the
whole episode, and hiding them while showing three hosts credits the wrong
people. A name on its own is a thin card, and that is the point at which
somebody writes a bio in Notion.

Both replaced a single `Authors` multi-select that mixed the two together and
could not tell you which was which. It was retired from Notion on 2026-07-29
and nothing stands in for it: a story with neither a guest nor a host is
credited to nobody, and `npm run test:content` fails the build rather than
publishing it uncredited.

**Both databases carry the same four profile links**: `URL` (`Website` on
guests), `LinkedIn`, `Mastodon` and `Bluesky`. `profileLinks` in
`src/lib/people.ts` is the one list that orders them, and everything that shows
a person's links reads it — the organiser page, the organiser card's icons, a
session's guest block, and the `sameAs` on every `Person` node. Adding a fifth
network is that list plus an icon, not a change in four places.

**Store the full URL, not the handle.** Mastodon and Bluesky are both written
`@name@server` in conversation, and neither is a link. `@kenny_baas@mastodon.social`
is `https://mastodon.social/@kenny_baas`, and `@kenny.weave-it.org` is
`https://bsky.app/profile/kenny.weave-it.org`. A handle in the field publishes a
broken link and a broken `sameAs`, and the sync cannot tell the difference
because Notion's URL property does not either.

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

## Conferences

The DDD conferences and camps on the home page. **Not a content type**: there is
no page, no slug and no address of ours. The card *is* the content and it links
straight out, which is why this sits with organisers and guests in the sync's
row table rather than with sessions.

**The dates go stale on their own, and that is the whole design problem.** A
conference recurs annually, so every date in this database expires without
anybody touching Notion — and a date going by is not a diff, so it triggers no
sync, no build and no deploy. Three things follow, and they are the reason the
code looks the way it does:

- **The card decides in the browser, not at build time.** `src/lib/conferences.ts`
  holds the rule; the build orders the row with it and
  `src/scripts/conference-timing.ts` applies the same rule again from the
  clock. This is the same shape as the upcoming/past session split, for the
  same reason, and the two must not disagree.
- **An edition that has been sinks to the end of the row and says "No new dates
  announced yet"** rather than disappearing. Hiding it would empty the section
  and say less than a card saying so, and the conference has not gone anywhere.
- **The sync raises `dates-passed`** so Discord asks somebody to find the new
  dates. Nothing on the page is wrong in the meantime; it is just less useful
  than it should be.

**`Show on site`** is the publish gate: untick it to take a conference off the
home page without losing the row.

**The logo is a link, not an upload**, unlike an organiser's photo. It points at
the conference's own asset; the sync downloads it, shrinks it and commits the
copy, so the site never depends on their server at build or at run time. If the
link stops answering, the last good copy stands and `image-source-gone` says so.

**`Logo background` is a hex colour per row**, because these are four other
people's marks and they do not agree with each other: three are dark type on
transparent and DDD Europe's is light type on its own navy. A colour in the
data is what lets a fifth conference look right without a code change.

## Publish gates (per database, not global)

- **Sessions** render in two states, derived from `Datetime`, not from a manual
  flip: `Status = Published` + a future `Datetime` → **upcoming** (RSVP);
  `Status = Done` → **past archive** (recording, notes). A session stays
  `Published` from go-live until post-production finishes, so both of the live
  states are also the two states a session can be in after it has happened —
  the page never comes down in between.

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
- **Conferences**: `Show on site` ticked.
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
