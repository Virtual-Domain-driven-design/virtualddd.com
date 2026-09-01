# From Notion to the site

How a change in Notion becomes a deployed page, what the sync does and does
not do, and what it asks a person to decide. Read this before changing the
sync, debugging a missing page, or asking why nothing deployed.

Part of the working brief: [AGENTS.md](../AGENTS.md) is the map, and
[README.md](../README.md) is the front door.

---

# From Notion to the site

Build in **CI only**, never on the host. And the whole pipeline is *automation
over a manual process*: running the sync and `git push` by hand must always
produce a correct deploy. If every automated part breaks, publishing degrades
to a script and a commit, never an outage. Keep it that way.

```
                     ┌── n8n, hourly ──┐
Notion ──────────────┤  n8n dispatch   ├──► sync.yml ──► deploy.yml ──► Discord
        (a session   └── GitHub cron ──┘     (~20s)      build, test,
         going live)     (backstop)                      rsync
```

**The clock does the work. An event is only ever a shortcut.**

- **Editing rides the clock**: an hourly sync, no watcher at all. This is why
  there is no debouncing anywhere. Notion's "page updated" cannot tell a new
  publication from a typo on an old one, so filtering it would fire on every
  keystroke-sized change; not watching is simpler than throttling.

  It is also what makes the pipeline self-healing, and the reason nothing else
  needs to be. The hourly run holds no state, cares nothing for why the last
  run did not happen, and re-reads everything. So a missed event, or an
  afternoon with n8n switched off, cost latency and nothing else.

  **A failed deploy is the exception, and the clock does not heal it.** By the
  time a deploy fails its content is already committed, so every later sync
  correctly finds no diff and publishes nothing: the stale site is not waiting
  on the next hour, it is waiting on the next *edit*, which may be days away.
  That is why the deploy announces its own failures to Discord rather than
  trusting the clock, and why `retry-blocked-deploy.yml` exists for the one
  cause that a second attempt genuinely fixes. Twice on 2026-08-10 a blocked
  deploy left committed content unpublished until a person re-ran it by hand.
- **The clock is n8n's, not GitHub's.** It was GitHub's until an edited guest
  bio sat unpublished for an afternoon. `sync.yml` asks for `25 * * * *`, and
  across the day around that edit the scheduled runs actually landed at 00:53,
  04:37, 06:02, 07:57, 10:55 and 13:07: GitHub delays and drops scheduled runs
  on a repository that is mostly quiet, and no cron expression argues with
  that. "Live within the hour" was quietly a three-hour promise.

  So the **VirtualDDD hourly sync** workflow in n8n fires the same
  `repository_dispatch` every hour, and the cron in `sync.yml` stays on as the
  backstop for a day n8n is off. It is as dumb as the cron it replaced and must
  stay that way: it never asks whether anything changed, because the sync
  re-reads everything and deploys nothing unless it produced a diff. Two clocks
  overlapping cost a minute of CI, which is the price of not having to trust
  either one.
- **Publishing a session** is the one thing worth not waiting an hour for, and
  the one thing with an event already to hand: the **VirtualDDD GoLive session**
  workflow knows the moment it sets `Status = Published`, and dispatches from
  there. Everything else published in Notion (a story, a heuristic, an open
  space) is deliberate, unhurried work, and rides the clock with the edits.

  There is no watcher, and deliberately so. A poll comparing Notion against the
  site's own `/llms.txt` would buy latency on that unhurried content and pay for
  it with a second copy of `CONTENT_SPECS` to keep in step, a guard against
  dispatching when the site is merely down, and a backoff for pages the sync can
  never render. The hourly clock already gives what such a poll would be
  credited with. If publishing ever does become urgent, shorten n8n's hour
  before adding a watcher.
- **Drift** heals nightly (`--full`, 03:17 UTC), which is also what re-pulls
  the ddd-crew repositories. This is a different job from the hourly sync, not
  a slower copy of it. Which repos to pull is read from Notion on *every* run,
  because that is one query; the READMEs are fetched when the nightly full run
  comes round, or straight away when `data/ddd-crew.json` changed, so adding a
  tool in Notion does not wait for the night. The hourly run only re-fetches a body Notion says has
  changed, so anything that goes stale *without* an edit — an image whose
  source died, a README upstream, a page the sync skipped on a bad day — is
  only ever caught here.

  It is still on GitHub's cron, and it can afford to be: nobody minds drift
  healing at 05:00 instead of 03:17, and a night it is dropped altogether is
  covered by the next one. Latency is the only thing GitHub's scheduler costs,
  and this is the one run with latency to spare.

A typo is therefore live within the hour, a session going live in about ninety
seconds, and an hour in which nobody touches Notion costs one minute of CI and
deploys nothing.

**Nothing deploys unless the sync produced a diff.** The generated markdown is
committed, so `git diff --quiet` is the whole test.

**The deploy builds the commit the sync just made, and says which.** A called
workflow runs at the *caller's* commit, and the sync commits after its own run
has begun. So `deploy.yml` takes a `ref` input and `sync.yml` passes the sha
it pushed. Without it every sync-triggered deploy shipped the site as it stood
*before* the content it was called to publish: green run, correct summary, site
one commit behind. It survived launch day because a sync that changes nothing
deploys nothing, and a push deploys its own sha correctly. The first real
content change was the first time it could be seen. The release directory, the
Discord link and the `What is being built?` step all follow the built commit
now, for the same reason: this was invisible because nothing said out loud
which commit was being published.

## The sync is incremental

`data/sync-state.json` records, per page, the slug and Notion's
`last_edited_time` at the last render.

- **Front matter is rebuilt every run**, because properties arrive free with
  the list query, and because a relation can go stale without the page being
  touched: publishing a heuristic should add a link to the sessions that
  reference it.
- **A body is re-fetched only when Notion says that page changed.** Bodies are
  the expensive part, about two seconds each.

A full sync is ~10 minutes; a routine one is ~20 seconds. `--full` ignores the
state and re-fetches everything.

Trailing blank lines are normalised where the file is written, not in either
branch, so a fetched body and a reused body are byte-identical. Without that a
changed page would flip-flop between syncs and "no diff, no deploy" would ship
whitespace.

## Images

Every picture is **downloaded** into the entry's `_assets/` and referenced
relatively, because a Notion file URL is signed and expires within the hour.

**A download that fails never removes a picture the site already has.** If the
source will not answer, the copy from the last good sync stands and an
`image-source-gone` alert names the URL that died. Launch day is why: eight
organiser photos were *external* URLs into the old WordPress media library, so
swapping the document root 404'd all eight, and the next sync rewrote every row
without a photo and reported `✓`. The bytes were in `_assets` the whole time.
Because the file on disk outlives the row that references it, this also repairs
itself on the next run.

**Prefer a Notion-hosted file to an external URL** in any property the site
reads. External URLs are somebody else's uptime, and one of those somebodies is
a site we turned off.

Assets are pruned less eagerly than entries: a renamed or retired page's JSON
goes, its old images stay. Harmless, since Astro bundles only what is
referenced, but they accumulate.

## Generated content is not editable here

`src/content/` is written by the sync and never edited in this repository.
Three layers keep that true, because with an incremental sync a stray edit
would otherwise persist rather than being overwritten within minutes:

- **The sync notices.** `sync-state.json` records a digest of every body it
  wrote. If the file on disk no longer matches, the page is refetched from
  Notion and the edit is named in the log. A missing digest counts as
  unknown provenance and also refetches. A guard that trusts by default is
  a decoration.
- **CI refuses to deploy it.** A push touching `src/content/` by anyone other
  than `virtualddd-sync` fails the deploy with an explanation, rather than
  shipping a site that says something Notion does not.
- **CODEOWNERS** puts a maintainer on any pull request that touches it.

None of this is about mistrust. The edit would simply be lost on the next sync,
and it is kinder to say so immediately than to let someone write something that
quietly disappears.

## When an editorial change breaks a URL

A URL is a promise. Two ordinary actions in Notion break one, and the sync
handles both rather than leaving them for someone to notice.

- **A renamed slug** is not ambiguous: the same page id under a new slug is a
  fact. The sync writes the `301` itself into `data/retired-urls.csv`, which
  `build-redirects.mjs` reads.
- **A page that stops being published** is ambiguous, so the editor says which
  they meant with the **`Retire URL`** checkbox:
  - **ticked** → they mean it. The page goes, and the address answers `410 Gone`.
  - **not ticked** → **quarantine**. The page keeps being served, everything
    else deploys, and `data/sync-alerts.json` tells the workflow to raise it
    with a human. An accidental unpublish must not silently 404 an address
    other people have linked to, and it must not block everyone else's publishing
    either.
  - **never had a public URL** → just removed; there is no promise to keep.

Never resolve one of these by deleting the URL from `data/live-urls.txt`. That
file is the promise, not a record of what happens to be built.

## Things only an editor can decide

`data/sync-alerts.json` collects what the sync can see but must not act on.
Three kinds, all *published in Notion, not true on the site*:

- **`person-renamed`**: an organiser's row was renamed in Notion. Their slug
  comes from their name, so the page moved; the 301 is recorded in
  `data/retired-urls.csv` by the same run, and the alert exists because a
  person has no `Retire URL` checkbox and nobody decided this. Unlike the
  others it is an *event*, not a condition, so it clears on the next sync
  whether or not anyone read it.
- **`unpublished-but-live`**: the quarantine above.
- **`published-without-a-slug`**: a page Notion calls published that has no
  slug, and therefore no address. Skipping it is right; there is nothing to
  build. Skipping it *silently* is not: the editor believes it is on the site,
  and only they can give it a slug.
- **`missing-required-field`**: the same shape, one field along. A published row
  with nothing in a property the schema demands, such as a session with no
  Datetime. The row is not written, because a file without it is one the build
  refuses, and that refusal is not confined to the page: `astro check` is the
  deploy's first step, so one unscheduled session would stop the whole site
  publishing. Which fields these are is declared per collection as `requires`
  in `scripts/sync-notion.ts`, named after the front-matter key the schema
  demands rather than the Notion property, because the schema is what has to be
  satisfied.
- **`entry-rejected`**: the backstop for the fields nobody thought to gate.
  After the sync writes, `scripts/validate-content.mjs` runs Astro's own
  validator over the generated content; any entry it refuses is put back to its
  last committed version, or left out entirely if it has never been published,
  and raised here. The page then shows what it showed before rather than
  nothing, and every other page still ships. If this fires, the gate that
  should have caught it upstream is missing, and the alert is the request to
  add one.

None of them is worth failing a run over, and all are invisible if they only
reach a CI log, which is the whole reason the file exists. It is keyed by section and
rewritten on every run, so resolving the last one empties the list rather than
leaving a stale alert behind, and one collection cannot erase another's.

It carries no timestamp on purpose: a `generated` field would change on every
run, and *nothing deploys unless the sync produced a diff* would quietly become
false. `sync.yml` posts it to Discord only when the file itself changed, which
is what stops the same alert being raised every hour for weeks.

**It must be committed, and `.gitignore` must never claim it.** The "has this
changed?" test is `git status --porcelain` on that one file, and for an ignored
file the answer is always nothing. So every alert the pipeline ever produced
took the "already raised" branch and reached nobody, including eight organiser
photos on launch day. The step now fails outright if the file is ignored,
because that failure is silent and looks exactly like having nothing to say.

Three more kinds join them:

- **`image-source-gone`**: the picture in Notion points somewhere that stopped
  answering. The sync keeps the copy it downloaded last time rather than
  dropping the image, so the page is still right; only an editor can re-upload
  the original. See "Images", earlier in this document.
- **`unusable-url`**: a URL property holds something that is not an address.
  Notion's URL property is a text box and takes anything; the schemas in
  `src/content.config.ts` say `z.url()` and take rather less. The field is left
  out so the rest of the site can ship, which means a link an editor believes is
  on the page is not there, and only they know what it should have said.

  A *missing scheme* is not this. `trainitek.com` means `https://trainitek.com`,
  the sync says so in the run log and publishes it, and nobody is interrupted:
  the published link is already what the editor meant.

  It exists because the alternative was found twice, both times from the wrong
  end. On 2026-08-03 a guest's Website was typed without a scheme and twelve
  consecutive deploys failed overnight; on 2026-08-08 another was, and the site
  went two days without a release. `astro check` is the first step of the
  deploy, so one editorial typo stopped everything else from shipping — which is
  exactly the bargain `Content report` refuses to make in the other direction.
  `scripts/lib/usable-url.ts` decides it now, and its promise is that whatever
  the sync publishes satisfies the schema that reads it.
- **`dates-passed`**: a conference edition that has been and gone. The card
  looks after itself, dropping to the end of the row and saying no new dates
  are announced, so nothing on the page is wrong. But it will keep saying that
  until somebody goes and finds the next edition, and this is the one alert
  that fires without anyone having touched Notion at all: a date going by is
  not an edit. See [content-model.md](content-model.md), "Conferences".

And one that is not an editorial decision at all:

- **`notion-schema-drift`**: a property the sync reads was renamed, deleted or
  retyped. Every other kind here says a person has to choose something; this one
  says the pipeline has stopped being able to read something, and that generated
  content is *already* wrong. It is the only kind that means go and look at the
  files.

  It exists because a rename fails nothing. The read returns nothing, every
  field is optional, so the run writes the record without it and deploys green;
  in the first week of August 2026 that happened four times and each was found
  days later by a person. `scripts/lib/schema-drift.ts` watches instead. Every
  typed reader passes the property name and the type it expects through one
  function, and a Notion page property arrives carrying its own `type`, so the
  comparison is free and needs no second list of expected properties to keep in
  step.

  A property counts as gone only when *no* row in the database had it, because
  one empty row is ordinary. A checkbox is never reported missing: Notion does
  not send one that has never been ticked, so absence there says nothing. Both
  rules are in `tests/unit/schema-drift.test.mjs`, each case a real incident.

  It detects rather than prevents. The order still matters: change the code
  first, then the Notion property.
