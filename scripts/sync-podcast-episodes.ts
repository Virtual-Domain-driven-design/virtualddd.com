/**
 * Refresh `data/podcast-episodes.json`: which episode is which on Apple.
 *
 *   npm run sync:podcasts
 *
 * ## Why this exists
 *
 * A page can link to *the show* on seven platforms without asking anybody
 * anything, because every one of those URLs is a function of the Apple ID or
 * the feed URL (see `src/lib/podcasts.ts`). Linking to *the episode* is a
 * different problem: Apple, Spotify, Deezer, Amazon and Player FM each mint
 * their own episode ID, and none will accept an ID we already hold. There is no
 * arithmetic that gets there. Somebody has to ask.
 *
 * Apple is the one that answers for free: the iTunes lookup API needs no key
 * and returns `episodeGuid` alongside the episode's own ID.
 *
 * ## The join, which is the whole difficulty
 *
 * What Notion stores is a Captivate *player* URL, whose ID is the media ID.
 * What Apple answers with is the RSS `<guid>`. Those are the same string for
 * the eight sessions recorded natively on Captivate and different for the 51
 * imported from Libsyn, because an import keeps the original guids so that
 * subscribers are not served the back catalogue a second time. Assuming they
 * match gets you 8 of 59 and looks like it works.
 *
 * The feed holds both: `<guid>` and an enclosure at
 * `episodes.captivate.fm/episode/<media-id>.mp3`. So this fetches the feed to
 * learn media ID → guid, fetches Apple to learn guid → episode ID, and writes
 * the composition, keyed by the media ID the pages actually have.
 *
 * ## Why the answer is committed rather than fetched at build time
 *
 * The build must not depend on a third party being up, and these IDs change
 * about once a fortnight, when an episode is published. So this runs with the
 * sync, writes a file, and the build reads the file. If Apple is down the site
 * still builds with the last good answer, which is a property `index.astro`'s
 * Bluesky fetch does not have and cannot have.
 *
 * ## What it will not do
 *
 * It never removes an entry. A short answer almost always means a truncated
 * feed rather than a deleted episode — Captivate serves only the most recent N
 * items, and for the Stories show N is 15 — and dropping the link would quietly
 * break a page that was working. Entries nothing mentioned are reported, kept,
 * and are the reason this file is worth reading when a link goes missing.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { SHOWS, type ShowKey } from '../src/lib/podcasts.ts';

const FILE = 'data/podcast-episodes.json';
const write = process.argv.includes('--write');

type Episodes = Record<string, string>;
const before: Record<string, Episodes> = existsSync(FILE)
  ? JSON.parse(readFileSync(FILE, 'utf8'))
  : {};

const after: Record<string, Episodes> = {};
let failed = false;

async function get(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
  return res.text();
}

for (const show of Object.values(SHOWS)) {
  try {
    // 1. The feed: media ID → guid, one pair per item that has both.
    const xml = await get(show.feed);
    const mediaByGuid = new Map<string, string>();
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const guid = item.match(/<guid[^>]*>([^<]+)<\/guid>/)?.[1];
      const media = item.match(/<enclosure url="[^"]*?\/episode\/([0-9a-f-]{36})/i)?.[1];
      if (guid && media) mediaByGuid.set(guid.toLowerCase(), media.toLowerCase());
    }

    // 2. Apple: guid → its own episode ID. Served as text/javascript, so the
    //    parse is explicit rather than trusting `res.json()`.
    const lookup = JSON.parse(
      await get(`https://itunes.apple.com/lookup?id=${show.appleId}&entity=podcastEpisode&limit=200`),
    );
    const found: Episodes = {};
    let unjoinable = 0;
    for (const r of lookup.results ?? []) {
      if (r.wrapperType !== 'podcastEpisode' || !r.episodeGuid || !r.trackId) continue;
      const media = mediaByGuid.get(String(r.episodeGuid).toLowerCase());
      if (media) found[media] = String(r.trackId);
      else unjoinable++;
    }

    const kept = Object.keys(before[show.key] ?? {}).filter((m) => !(m in found));
    after[show.key] = { ...(before[show.key] ?? {}), ...found };

    console.log(
      `  ${show.name}: ${mediaByGuid.size} in the feed, ${Object.keys(found).length} matched on Apple` +
        (unjoinable ? `, ${unjoinable} Apple episodes not in the feed window` : '') +
        (kept.length ? `, ${kept.length} kept from the last run` : ''),
    );
  } catch (err) {
    console.error(`  ✗ ${show.name}: ${err instanceof Error ? err.message : err}`);
    failed = true;
    after[show.key] = before[show.key] ?? {};
  }
}

// Sorted keys, so a run that learns one episode is a one-line diff.
const sorted = Object.fromEntries(
  (Object.keys(SHOWS) as ShowKey[]).map((k) => [
    k,
    Object.fromEntries(Object.entries(after[k] ?? {}).sort(([a], [b]) => a.localeCompare(b))),
  ]),
);
const json = JSON.stringify(sorted, null, 2) + '\n';

if (!write) {
  console.log(`\nDry run. Pass --write to update ${FILE}.`);
} else if (existsSync(FILE) && readFileSync(FILE, 'utf8') === json) {
  console.log(`\n${FILE} is already up to date.`);
} else {
  writeFileSync(FILE, json);
  console.log(`\nWrote ${FILE}.`);
}

// A failed lookup is not a failed build: the committed file is still good.
// Exit non-zero anyway so the sync's summary says a run was incomplete.
if (failed) process.exit(1);
