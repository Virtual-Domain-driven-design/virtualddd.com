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
| ddd-crew (which tools, not their text) | `9503b575-65e8-49c5-a4c0-e80099ec2c2c` |

ddd-crew *content* comes from GitHub, not Notion (`npm run sync:ddd-crew`).
Which repos it fetches comes from Notion — see [ddd-crew content](#ddd-crew-content).

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

**Store the handle, not the URL.** On both databases `Mastodon` and `Bluesky`
are plain **text** and hold `@sebrose@mastodon.scot` or
`@vanessaformicola.bsky.social`. They were URL properties until 2026-08-01 and
were changed because the n8n social flows put a handle straight into a post: a
URL is not what you write in a toot, and deriving one from the other is only
possible in this direction. `Website`, `URL` and `LinkedIn` stay URLs, because
neither has a handle anyone writes down.

`socialUrl` in `src/lib/people.ts` goes back the other way for the site. It
turns `@user@instance` into `https://instance/@user` and `@name.tld` into
`https://bsky.app/profile/name.tld`, still accepts a URL so an older row keeps
working, and **drops anything it cannot resolve**: `@sebrose` with no instance
names nobody in particular, so it is left out rather than guessed at. That
matters because these values are not only links on a page, they are the `sameAs`
on a `Person` node, which is a claim about who someone is.

*How we know: **machine, partly.** `tests/unit/people.test.mjs` covers the
handle, the URL and the unresolvable one. Nothing checks that a handle in Notion
is spelled correctly, so a typo publishes a link to a profile that does not
exist.*

The cost is that someone who both organises and speaks has a row in each. That
is deliberate; the alternative, one people table with a flag, was rejected
because it would put 60+ external speakers into the database the community is
actually run from. Eight people have both rows today.

**`Organiser row` on a guest is what joins the pair.** A relation to the
organisers database, which the sync resolves to that organiser's entry id and
writes as `organiser` on the guest entry. `pairedWith` in `src/lib/people.ts`
reads it, and believes it *instead of* the name rather than alongside it: a
relation pointing somewhere is an editor saying who this is, and a name match
overruling them would be the guess the relation exists to replace. A pair
nobody has linked yet still falls back to `samePerson`.

It replaced a checkbox called `Also an organiser`, and the reason is worth
keeping. That checkbox was read by the sync, written into all 119 guest files,
read by **nothing**, and ticked on **no row at all** — so the docs claimed a
duplicate was "findable" while nothing could find one. A name match cannot
close the gap on its own either: the organiser row reads `Maxime` and the guest
row `Maxime Sanglan-Charlier`, and `samePerson` rejects that pair on purpose,
because a bare first name names nobody in particular.

**Both rows fill each other in, in both directions.** Neither is complete: the
operational row has who runs what, and the guest row is the one written to make
a good `Person`, so it is where bios and profile links got filled in. So a
session or story page leads with the guest row and falls back to the organiser
row, an organiser page leads with the organiser row and falls back to the guest
row, and both use `mergeProfiles` — **field by field, not list-or-list**.
Whole-list fallback was a real bug: Krisztina's LinkedIn is on one row and her
Mastodon on the other, and Diana's organiser page published one profile out of
the four we hold for her.

*How we know: **machine.** `tests/unit/people.test.mjs` covers the relation
beating the name, the fallback when there is no relation, a relation pointing
at a deleted row, and that both directions agree. Nothing checks that an
editor filled the relation in, so an unlinked pair is silently a name match.*

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

`scripts/backfill-guests.ts` went the same way, and for a sharper reason. It
copied a matched organiser's links onto the guest row so n8n, which reads Notion
directly and cannot do the join, would find a handle. Two things had rotted
under it: the guest rows are now the *richer* of the two, so it was copying the
staler row over the better one, and it still wrote to `LinkedIn`, `Mastodon` and
`Bluesky` after the Guests database renamed those to `LinkedIn Url`,
`Mastodon Tag` and `Bluesky Tag`, so a `--write` run would have failed on most
rows. A script that writes into the source of truth and is run once a year is a
script nobody maintains. `git log -- scripts/backfill-guests.ts` has it if the
n8n side ever needs solving again — but `Organiser row` is now a relation those
flows can follow themselves.

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
- **ddd-crew**: `Status = Published` puts a tool on the gallery; `Republished`
  decides whether it gets a page here or a link out to GitHub.
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

## Two sources, and the line between them

The **text** is the repository's: title, description, README, diagrams,
contributors, stars. `scripts/sync-ddd-crew.ts` fetches it and writes
`src/content/ddd-crew/<repo>.md`. Nothing about it is ours to decide.

**Which tools the section carries, and how it reads**, is ours, and lives in the
🛠️ ddd-crew database in Notion (`9503b575-65e8-49c5-a4c0-e80099ec2c2c`). One
row per repo:

| Property | What it does |
|---|---|
| `Name` | The name on a link-out card. A republished page uses the README's own H1 instead, because that is the author's title for their own work |
| `Repo` | The `ddd-crew/<repo>` name. It is the file name and therefore the address, so changing it moves a page |
| `Link` | The upstream repository. Where a link-out card goes; defaults to `github.com/ddd-crew/<Repo>` |
| `Republished` | CC BY-SA 4.0, so we may host the README at `/ddd-crew/<repo>/`. Off means the card links out to GitHub and no README is fetched |
| `Category`, `Order` | Where the card sits. The **select's own option order** is the category order on the page, so dragging an option reorders the gallery |
| `Status` | The publish gate: `Published` shows it, anything else does not |
| `Why it is worth it` | Our sentence, shown on a link-out card, where there is no README to describe itself |

`npm run sync:ddd-crew-config` writes that to
[`data/ddd-crew.json`](../data/README.md), which is what
`scripts/sync-ddd-crew.ts` and `/ddd-crew/` both read. **A row is not a page
until its README has been fetched**: a repo ticked `Republished` whose markdown
is not there yet renders as a link-out card, so the hour between the two syncs
shows a working card rather than a broken link.

**Un-ticking `Republished`, or moving a row off `Published`, deletes the page**
and `/ddd-crew/<repo>/` starts answering 404. Nothing records a redirect for it,
deliberately: a tool put back next week would be shadowed by the rule that
retired it. If a tool is going away for good, add the address to
`data/retired-urls.csv` by hand.

**Only the repository decides its own branch.** The sync reads `default_branch`
from the API rather than assuming `main`, and rewrites the README's own absolute
`blob/master` links to that branch (`retargetBranch` in `src/lib/ddd-crew.ts`).
Every ddd-crew repo renamed `master` to `main`, and GitHub's redirect for that
is a courtesy, not a promise. Only the literal `master` is touched: any other
branch segment could be a tag or a commit SHA, and a permalink rewritten to a
moving branch is worse than a redirected one.

---
