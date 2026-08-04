/**
 * Notion → src/content/. The script the whole publishing loop rests on.
 *
 *   content --collection=<name>   pages to markdown
 *   organisers                    the team, as JSON
 *   guests                        session speakers, as JSON
 *   ddd-crew                      which ddd-crew repos the site shows, as JSON
 *
 * Nothing here is hand-edited afterwards: Notion is the source of truth and
 * this is the only writer. Add --write to land files under src/content/;
 * without it everything goes to a preview directory instead.
 *
 * See docs/content-model.md.
 */
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { normaliseTags } from '../src/lib/tags';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  createBlocksToMd, assetRefs, fileUrl, imageExt, isAssetFor, kebab, movedSlugs, plainTitle,
  resolveRelation, statusOf, yamlList, yamlStr,
  type AssetCtx, type StatusKind,
} from './lib/notion-md';
import { byGallery, CREW_CONFIG_FILE, type CrewConfig, type CrewTool } from '../src/lib/ddd-crew';
// The same rule the cards use, so the sync cannot decide a conference is over
// on a different day from the page that renders it.
import { hasPassed } from '../src/lib/conferences';

dotenv.config({ path: 'local.env' });

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN missing (expected in local.env).');
  process.exit(1);
}
const notion = new Client({ auth: token });

// --- API pacing -------------------------------------------------------------
// Notion allows roughly three requests per second and answers 429 above that.
// Every call goes through `api()`, which paces requests and retries on 429 or
// a transient 5xx, so a large sync cannot fail halfway for want of patience.

const MIN_INTERVAL_MS = 340; // ≈ 2.9 req/s
let nextSlot = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api<T>(label: string, fn: () => Promise<T>, attempt = 0): Promise<T> {
  const wait = Math.max(0, nextSlot - Date.now());
  if (wait) await sleep(wait);
  nextSlot = Date.now() + MIN_INTERVAL_MS;
  try {
    return await fn();
  } catch (e: any) {
    const status = e?.status ?? e?.code;
    const retriable = status === 429 || status === 502 || status === 503 || status === 504 ||
      e?.code === 'notionhq_client_request_timeout';
    if (!retriable || attempt >= 4) throw e;
    const retryAfter = Number(e?.headers?.['retry-after'] ?? 0);
    const backoff = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
    console.warn(`  … ${label} got ${status}; retrying in ${Math.round(backoff / 1000)}s (attempt ${attempt + 2}/5)`);
    await sleep(backoff);
    return api(label, fn, attempt + 1);
  }
}

/** Every row of a data source, paged. */
async function queryAll(dataSourceId: string): Promise<any[]> {
  const rows: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await api('query', () => notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    }));
    rows.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return rows;
}

// --- content command: Notion pages -> markdown ------------------------------
//
// Hand-rolled block -> markdown converter (Notion v5 data-source API).
// Embeds and callouts are preserved deliberately — they are the first thing a
// naive converter loses. Under --dry-run the output goes to a preview
// directory so fidelity can be inspected before anything lands in
// src/content/.

import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';

const PEOPLE_DS = 'cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6'; // Sessions Organiser/Co-Organisers
const GUESTS_DS = 'd82910e0-cac0-46f8-8a20-cb3a3376d5eb'; // Sessions Guests (speakers, panellists)
const HEURISTICS_DS = 'e7743290-3850-404e-ae98-23a4caf0488e';
const CONFERENCES_DS = 'c5b9e231-6766-4589-a179-c70d20db3e34'; // DDD conferences and camps, on the home page
const DDD_CREW_DS = '9503b575-65e8-49c5-a4c0-e80099ec2c2c'; // which ddd-crew repos /ddd-crew/ shows

// --- what the last sync saw -------------------------------------------------
//
// Fetching a page's blocks costs about two seconds; reading its properties is
// nearly free, because they arrive with the list query. So a sync re-renders
// every entry's front matter every time — a relation can go stale without the
// page itself being touched, e.g. publishing a heuristic should add a link to
// the sessions that reference it — and re-fetches a *body* only when Notion
// says that page changed.
//
// The state is committed rather than cached: it makes a rename visible as a
// fact (the same page id under a new slug) instead of a guess, and it keeps
// the "a script and a commit" fallback working from a clean checkout.

const STATE_FILE = 'data/sync-state.json';

interface EntryState {
  slug: string;
  /** Notion's `last_edited_time` when we last rendered this body. Absent for a
   *  row collection, which has no body to be stale: the slug is the whole
   *  point of remembering it. */
  edited?: string;
  /** Digest of the body we wrote, so an edit made here rather than in Notion
   *  is noticed and refetched instead of being quietly kept. */
  hash?: string;
}

/** Short, stable digest of a body. Only ever compared with itself. */
const digest = (body: string) => createHash('sha256').update(body).digest('hex').slice(0, 16);
type SyncState = Record<string, Record<string, EntryState>>;

function loadState(): SyncState {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}

/** Sorted at both levels, because JSON key order is insertion order and the
 *  inner keys arrive in whatever order Notion returned the rows in. That order
 *  is not something Notion promises to keep, and an unsorted file would diff
 *  whenever it shifted — with no page having changed. `git diff --quiet` is the
 *  entire deploy gate, so that means a build, an rsync and a Discord post
 *  announcing nothing. Sorting makes the file a function of its contents. */
function saveState(state: SyncState) {
  mkdirSync('data', { recursive: true });
  const byKey = (entries: Record<string, EntryState>) =>
    Object.fromEntries(Object.keys(entries).sort().map((id) => [id, entries[id]]));
  const ordered = Object.fromEntries(
    Object.keys(state).sort().map((k) => [k, byKey(state[k])]),
  );
  writeFileSync(STATE_FILE, JSON.stringify(ordered, null, 2) + '\n');
}

// --- the redirect ledger ----------------------------------------------------
//
// A URL is a promise, and two ordinary editorial actions break one: renaming a
// slug, and taking a page down. Both are recorded here rather than left for a
// person to notice — `scripts/build-redirects.mjs` reads this file, so the
// promise is kept by the same run that broke it.
//
// A CSV because it is meant to be read in a diff: each line is one address and
// what happened to it.

/** Every address the site has promised to answer. */
function liveUrlSet(): Set<string> {
  try {
    return new Set(readFileSync('data/live-urls.txt', 'utf8').trim().split('\n').map((l) => l.trim()));
  } catch { return new Set(); }
}

const ALERTS_FILE = 'data/sync-alerts.json';

/** Something a person has to decide, that the sync cannot decide for them. */
interface Alert {
  /** `unpublished-but-live` — an address still served because nobody said to
   *  retire it. `published-without-a-slug` — a page Notion calls published that
   *  has no address at all, so nothing will ever render it.
   *  `image-source-gone` — the picture in Notion points somewhere that no
   *  longer answers; the site is showing the last copy it downloaded, and only
   *  an editor can re-upload it.
   *  `dates-passed` — a conference edition that has been and gone. The card
   *  now says no new dates are announced, which is true but is not what anyone
   *  wants it to say for long; only a person can go and find the next edition.
   *  `person-renamed` — somebody's row was renamed in Notion, and an
   *  organiser's slug comes from their name, so their page has moved. The
   *  redirect is already recorded; this says so out loud, because a person is
   *  a row rather than a page and has no `Retire URL` checkbox to tick, so
   *  nobody decided this and nobody would otherwise know it happened. */
  kind: 'unpublished-but-live' | 'published-without-a-slug' | 'image-source-gone' | 'dates-passed'
    | 'person-renamed';
  section: string;
  title: string;
  /** The public address for the first kind; the Notion page for the second,
   *  since there is no public address to link to. */
  url: string;
}

/** What the run wants a human to look at, for the workflow to hand to n8n.
 *
 * A file rather than a webhook call: the sync stays offline-friendly and
 * testable, and the pipeline decides where the message goes. Discord today,
 * a Notion comment when that integration is allowed to write them.
 *
 * Both kinds are the same shape of problem — published in Notion, not true on
 * the site, and only an editor knows which way it should go. Neither is worth
 * failing a run over, and both are invisible if they only reach a CI log.
 *
 * One collection per process but one file for all of them, so a run replaces
 * its own section's entries and leaves the others alone. Written even when
 * there is nothing to say, because something somebody has resolved has to be
 * able to disappear — a file that only ever grows is a file nobody reads.
 *
 * Deliberately carries no timestamp. The pipeline deploys only when the sync
 * produced a diff, and a `generated` field would change on every single run,
 * so an hour in which nobody touched Notion would ship a build anyway. Git
 * already records when this changed. */
function writeAlert(section: string, items: Alert[]) {
  mkdirSync('data', { recursive: true });
  let kept: Alert[] = [];
  try {
    kept = (JSON.parse(readFileSync(ALERTS_FILE, 'utf8')).items ?? [])
      .filter((i: { section?: string }) => i.section !== section);
  } catch { /* no file yet, or unreadable — this run writes a fresh one */ }

  const merged = [...kept, ...items]
    .sort((a, b) => (a.kind + a.url).localeCompare(b.kind + b.url));

  writeFileSync(ALERTS_FILE, JSON.stringify({ items: merged }, null, 2) + '\n');
}

const REDIRECTS_FILE = 'data/retired-urls.csv';

interface RedirectRule {
  from: string;
  /** Where it goes, for a 301. Empty for a 410. */
  to?: string;
  kind: '301' | '410';
}

export function recordRedirects(rules: RedirectRule[]) {
  if (!rules.length) return;
  const existing = new Map<string, string>();
  try {
    for (const line of readFileSync(REDIRECTS_FILE, 'utf8').trim().split('\n').slice(1)) {
      const [from] = line.split(',');
      if (from) existing.set(from, line);
    }
  } catch { /* first write */ }

  const today = new Date().toISOString().slice(0, 10);
  for (const r of rules) {
    // A later rename wins: /a/ → /b/ → /c/ should send /a/ to /c/, not to a
    // page that has itself moved on.
    existing.set(r.from, `${r.from},${r.kind},${r.to ?? ''},${today}`);
  }
  // And collapse any chain the new rule just created.
  for (const [from, line] of existing) {
    const [, kind, to] = line.split(',');
    if (kind !== '301' || !to) continue;
    const onward = existing.get(to);
    if (onward) {
      const [, k2, t2] = onward.split(',');
      if (k2 === '301' && t2) existing.set(from, `${from},301,${t2},${today}`);
    }
  }

  mkdirSync('data', { recursive: true });
  writeFileSync(REDIRECTS_FILE,
    'from,kind,to,recorded\n' + [...existing.keys()].sort().map((k) => existing.get(k)).join('\n') + '\n');
}

/** The featured image and body of an entry already on disk, so an unchanged
 *  page costs no API calls at all. Null when there is nothing to reuse. */
function readExisting(path: string): { featured?: string; body: string } | null {
  try {
    const raw = readFileSync(path, 'utf8');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
    if (!m) return null;
    return { featured: m[1].match(/^featuredImage: "(.*)"$/m)?.[1], body: m[2].replace(/\n+$/, '') };
  } catch { return null; }
}

/** id -> value maps for relation resolution (page IDs are stored dashless-agnostic). */
async function buildLookup<T>(dataSourceId: string, label: string, valueOf: (page: any) => T) {
  const map = new Map<string, T>();
  try {
    for (const page of await queryAll(dataSourceId)) {
      map.set((page.id as string).replace(/-/g, ''), valueOf(page));
    }
  } catch (e: any) {
    console.warn(`  ! ${label} not readable (${e.code ?? e.message}); relation left unresolved. Share that database with the integration to fix.`);
  }
  return map;
}


const IMG_MAX = 1600;
/** Cap dimensions and recompress so committed source images stay small. */
async function shrinkImage(raw: Buffer, ext: string): Promise<Buffer> {
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return raw;
  try {
    let img = sharp(raw, { failOn: 'none' });
    const m = await img.metadata();
    if ((m.width ?? 0) > IMG_MAX || (m.height ?? 0) > IMG_MAX) {
      img = img.resize({ width: IMG_MAX, height: IMG_MAX, fit: 'inside', withoutEnlargement: true });
    }
    img = ext === 'png' ? img.png({ compressionLevel: 9, quality: 80 })
      : ext === 'webp' ? img.webp({ quality: 82 })
      : img.jpeg({ quality: 82, mozjpeg: true });
    const out = await img.toBuffer();
    return out.length < raw.length ? out : raw;
  } catch { return raw; }
}

/** Delete pictures no entry refers to any more.
 *
 * The entry files are the authority, not this run's bookkeeping: a sync is
 * incremental, so most entries were not re-rendered and their images must
 * survive. Called only where entries were pruned too — a partial run has not
 * seen enough of the collection to know what is unused.
 *
 * Not a space problem (one orphan in 245 after the whole migration). It is
 * that an image replaced in Notion leaves its predecessor behind for good,
 * and a directory nobody can explain is a directory nobody dares tidy. */
function pruneAssets(outDir: string, label = 'asset'): void {
  const assetDir = `${outDir}/_assets`;
  let files: string[];
  try {
    // Files only. This sync writes them flat, but ddd-crew nests its assets a
    // directory deep, and a `unlinkSync` on a directory throws — a tidy-up is
    // not worth failing a publish over.
    files = readdirSync(assetDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  } catch { return; } // nothing downloaded yet
  const referenced = new Set(
    readdirSync(outDir)
      .filter((f) => f.endsWith('.md') || f.endsWith('.json'))
      .flatMap((f) => assetRefs(readFileSync(`${outDir}/${f}`, 'utf8'))),
  );
  for (const f of files.filter((f) => !referenced.has(f))) {
    unlinkSync(`${assetDir}/${f}`);
    console.log(`  – removed ${label} ${f} (nothing refers to it)`);
  }
}

/** The asset an earlier sync stored for this slug and label, if it is still
 *  there. The naming rule is `isAssetFor` in scripts/lib/notion-md.ts. */
function existingAsset(dir: string, slug: string, label: string): string | null {
  try {
    return readdirSync(dir).find((f) => isAssetFor(f, slug, label)) ?? null;
  } catch { return null; } // no _assets directory yet: nothing to keep
}

/** Images kept from an earlier sync because their source stopped answering.
 *  Flushed into the alert file by whichever collection is being synced, so a
 *  person is told to re-upload rather than finding out from the page. */
const strandedImages: { slug: string; label: string; url: string; kept: boolean }[] = [];

/** What this run could not download, as alerts for the section being synced.
 *
 * `kept` is the difference between an inconvenience and a hole in the page,
 * and the message says which: a row that already had a picture still shows one,
 * a row that never did shows nothing at all until somebody fixes the link. */
const strandedAlerts = (section: string): Alert[] =>
  strandedImages.map((s) => ({
    kind: 'image-source-gone' as const,
    section,
    title: s.kept
      ? `${s.slug} (${s.label}): showing the last copy we downloaded`
      : `${s.slug} (${s.label}): no picture at all until this is fixed`,
    url: s.url,
  }));

/** Download an image next to the entry; return the `./` relative path or null.
 *
 * A download that fails must never *remove* a picture the site already has.
 * Going live proved why: eight organiser photos were external URLs into the
 * old WordPress media library, so the moment the document root swapped they
 * 404'd, and the next sync rewrote all eight rows without a photo — every
 * portrait gone from a green run that reported ✓. The bytes were still sitting
 * in `_assets` the whole time.
 *
 * So when the source will not answer, the copy from the last good sync stands.
 * That also repairs the damage by itself: a row whose photo was dropped gets
 * it back on the next run, because the file on disk outlives the JSON. */
async function downloadImage(url: string, ctx: AssetCtx, label: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    const ext = imageExt(raw);
    if (!ext) {
      const ct = res.headers.get('content-type') ?? 'no content-type';
      throw new Error(
        `what came back is not an image (${ct}, ${raw.length} bytes). ` +
        'A Photo that links to Google Drive returns the viewer page rather ' +
        'than the file; upload the picture into Notion instead.',
      );
    }
    const buf = await shrinkImage(raw, ext);
    const name = `${ctx.slug}-${label}.${ext}`;
    mkdirSync(ctx.dir, { recursive: true });
    writeFileSync(`${ctx.dir}/${name}`, buf);
    return `./_assets/${name}`;
  } catch (e: any) {
    const kept = existingAsset(ctx.dir, ctx.slug, label);
    // Either way an editor has to go and fix the row, so either way it is an
    // alert. Only the kept case used to raise one, so a *new* row with an
    // unusable picture failed into a log nobody reads, and the first anyone
    // knew of it was a red build in another workflow naming a filename.
    strandedImages.push({ slug: ctx.slug, label, url, kept: Boolean(kept) });
    if (kept) {
      console.warn(`    ! image source gone (${label}): ${e.message} — keeping ${kept}`);
      return `./_assets/${kept}`;
    }
    console.warn(`    ! no usable image (${label}): ${e.message}`);
    return null;
  }
}

/** The converter, bound to this script's paged API reads and image downloads.
 * The rules themselves live in scripts/lib/notion-md.ts and are unit-tested. */
const { blocksToMd, seenUnhandled } = createBlocksToMd({
  childrenOf: (id) => childrenOf(id),
  downloadImage: (url, ctx, label) => downloadImage(url, ctx, label),
});

async function childrenOf(blockId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await api('blocks.children', () =>
      notion.blocks.children.list({ block_id: blockId, page_size: 100, start_cursor: cursor }));
    out.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return out;
}

interface Helpers {
  get: (n: string) => any;
  text: (n: string) => string;
  multi: (n: string) => string[];
  url: (n: string) => string | undefined;
  date: (n: string) => string | undefined;
  num: (n: string) => number | undefined;
  select: (n: string) => string | undefined;
  /** A checkbox, false when the property is absent — Notion does not send one
   *  that has never been ticked. */
  checkbox: (n: string) => boolean;
  heur: (n: string) => string[];
  person: (n: string) => string[];
  guest: (n: string) => string[];
  img: (n: string, label: string) => Promise<string | null>;
}

interface ContentSpec {
  dataSourceId: string;
  /** URL section, so a rename can be turned into a redirect.
   *
   *  Omit it for a collection with no page per entry, such as the reading list:
   *  every row is rendered inside one list page, so a slug change moves an
   *  anchor rather than a URL and there is nothing to redirect. The rename
   *  tracking and redirect emission below already guard on this being present. */
  section?: string;
  titleProp: string;
  slugProp: string;
  statusKind: StatusKind;
  liveStatuses: string[];
  featuredImageProp?: string; // omit to skip featured-image download
  needsPeople?: boolean;
  needsGuests?: boolean;
  extra: (h: Helpers) => Promise<string[]>;
}

const CONTENT_SPECS: Record<string, ContentSpec> = {
  sessions: {
    dataSourceId: '33e9db0a-1418-4a3e-a053-33fa384e5e93',
    section: '/sessions/',
    titleProp: 'Name', slugProp: 'slug', statusKind: 'select',
    liveStatuses: ['Done', 'Published'], featuredImageProp: 'Featured image',
    needsPeople: true, needsGuests: true,
    extra: async (h) => {
      const l: string[] = [];
      if (h.date('Datetime')) l.push(`datetime: ${h.date('Datetime')}`);
      if (h.select('Type of session')) l.push(`typeOfSession: ${yamlStr(h.select('Type of session')!)}`);
      const level = h.multi('Level'); if (level.length) l.push(`level: ${yamlList(level)}`);
      const tags = normaliseTags(h.multi('Tags')); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['video', 'Video'], ['podcastPlayer', 'PodcastPlayer'], ['miro', 'Miro'], ['meet', 'Meet']] as const) {
        const u = h.url(p); if (u) l.push(`${k}: ${yamlStr(u)}`);
      }
      // Either spelling. The Notion property was `Humantix` for years, and a
      // rename on one side alone takes the RSVP button off every upcoming
      // session within the hour — the sync would read a property that is no
      // longer there and write nothing. Tolerating both makes the two renames
      // independent; drop the old name once Notion no longer has it.
      const rsvp = h.url('Humanitix') ?? h.url('Humantix');
      if (rsvp) l.push(`humanitix: ${yamlStr(rsvp)}`);
      const org = h.person('Organiser')[0]; if (org) l.push(`organiser: ${yamlStr(org)}`);
      const co = h.person('Co-Organisers'); if (co.length) l.push(`coOrganisers: ${yamlList(co)}`);
      const guests = h.guest('Guests'); if (guests.length) l.push(`guests: ${yamlList(guests)}`);
      const heur = h.heur('Curated Heuristics'); if (heur.length) l.push(`curatedHeuristics: ${yamlList(heur)}`);
      const t = h.text('SEO Title'); if (t) l.push(`seoTitle: ${yamlStr(t)}`);
      const d = h.text('SEO Metadescription'); if (d) l.push(`seoMetadescription: ${yamlStr(d)}`);
      return l;
    },
  },
  'open-spaces': {
    dataSourceId: '0cfb73c7-a638-4948-a4df-5fe06dcd2dd1',
    section: '/open-space/',
    titleProp: 'Name', slugProp: 'slug', statusKind: 'status',
    liveStatuses: ['Published', 'Done'], featuredImageProp: 'Featured image',
    extra: async (h) => {
      const l: string[] = [];
      if (h.date('Date')) l.push(`date: ${h.date('Date')}`);
      const tags = normaliseTags(h.multi('Tags')); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['video', 'Video'], ['podcast', 'Podcast'], ['meetup', 'meetup'], ['miro', 'miro'], ['tickets', 'tickets']] as const) {
        const u = h.url(p); if (u) l.push(`${k}: ${yamlStr(u)}`);
      }
      const t = h.text('SEO Title'); if (t) l.push(`seoTitle: ${yamlStr(t)}`);
      const d = h.text('SEO Metadescription'); if (d) l.push(`seoMetadescription: ${yamlStr(d)}`);
      return l;
    },
  },
  stories: {
    dataSourceId: '25aa485a-fafc-8047-94b7-000b3bbb228c',
    section: '/facilitating-archdes/',
    titleProp: 'Title', slugProp: 'slug', statusKind: 'status',
    liveStatuses: ['Published'], featuredImageProp: 'Featured image',
    needsPeople: true, needsGuests: true,
    extra: async (h) => {
      const l: string[] = [];
      const ep = h.num('Episode'); if (ep != null) l.push(`episode: ${ep}`);
      const pd = h.date('Published Date'); if (pd) l.push(`publishedDate: ${pd.slice(0, 10)}`);
      // `Guests` and `Hosts` replaced a single `Authors` multi-select that mixed
      // the two together and could not tell you which was which. Order matters:
      // the first guest is the one whose story it is, and two episodes in the
      // archive are the same pair the other way round.
      const guests = h.guest('Guests'); if (guests.length) l.push(`guests: ${yamlList(guests)}`);
      const hosts = h.person('Hosts'); if (hosts.length) l.push(`hosts: ${yamlList(hosts)}`);
      const tags = normaliseTags(h.multi('Tags')); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['youtube', 'YouTube'], ['podcast', 'Podcast']] as const) {
        const u = h.url(p); if (u) l.push(`${k}: ${yamlStr(u)}`);
      }
      const heur = h.heur('Curated Heuristics'); if (heur.length) l.push(`curatedHeuristics: ${yamlList(heur)}`);
      const t = h.text('SEO Title'); if (t) l.push(`seoTitle: ${yamlStr(t)}`);
      const d = h.text('SEO Metadescription'); if (d) l.push(`seoMetadescription: ${yamlStr(d)}`);
      const sq = await h.img('Featured image squared', 'featured-squared'); if (sq) l.push(`featuredImageSquared: ${yamlStr(sq)}`);
      return l;
    },
  },
  heuristics: {
    dataSourceId: HEURISTICS_DS,
    section: '/heuristics/',
    titleProp: 'Title', slugProp: 'Slug', statusKind: 'status',
    liveStatuses: ['Published'], // rendered as components for now — no featured image, no route
    extra: async (h) => {
      const l: string[] = [];
      const q = h.text('Question'); if (q) l.push(`question: ${yamlStr(q)}`);
      const type = h.multi('Type'); if (type.length) l.push(`type: ${yamlList(type)}`);
      const authors = h.multi('Authors'); if (authors.length) l.push(`authors: ${yamlList(authors)}`);
      const submitter = h.select('Submitter'); if (submitter) l.push(`submitter: ${yamlStr(submitter)}`);
      const tags = normaliseTags(h.multi('Tags')); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['competesWith', 'Competes With'], ['complements', 'Complements'], ['enables', 'Enables'], ['prerequisites', 'Prerequisites '], ['specializes', 'Specializes']] as const) {
        const v = h.heur(p); if (v.length) l.push(`${k}: ${yamlList(v)}`);
      }
      const md = h.text('Meta Description'); if (md) l.push(`metaDescription: ${yamlStr(md)}`);
      const st = h.text('SEO Title'); if (st) l.push(`seoTitle: ${yamlStr(st)}`);
      return l;
    },
  },
  // Books, papers and free PDFs we recommend. No `section`: there is no page
  // per book, because the only text on an entry that is ours is one sentence,
  // and a page wrapped around one sentence is the thin page that got the old
  // /videos/ section retired. They all render inside /reading-list/, and the
  // slug is the anchor there rather than a URL.
  'reading-list': {
    dataSourceId: '253adb92-df69-4664-838a-a28ea0798bf0',
    titleProp: 'Title', slugProp: 'Slug', statusKind: 'select',
    liveStatuses: ['Published'], featuredImageProp: 'Cover',
    extra: async (h) => {
      const l: string[] = [];
      const authors = h.text('Authors'); if (authors) l.push(`authors: ${yamlStr(authors)}`);
      const type = h.select('Type'); if (type) l.push(`type: ${yamlStr(type)}`);
      const link = h.url('Link'); if (link) l.push(`link: ${yamlStr(link)}`);
      const publisher = h.text('Publisher'); if (publisher) l.push(`publisher: ${yamlStr(publisher)}`);
      const year = h.num('Year'); if (year != null) l.push(`year: ${year}`);
      const isbn = h.text('ISBN'); if (isbn) l.push(`isbn: ${yamlStr(isbn)}`);
      const level = h.multi('Level'); if (level.length) l.push(`level: ${yamlList(level)}`);
      const topics = h.multi('Topics'); if (topics.length) l.push(`topics: ${yamlList(topics)}`);
      // Written even when false: the page orders free things first, and a missing
      // key and a false one must not read the same to the template.
      l.push(`free: ${h.checkbox('Free')}`);
      // The recommendation itself. Without it an entry is a link, not a
      // recommendation, so the page treats its absence as a reason to complain.
      const why = h.text('Why it is worth it'); if (why) l.push(`why: ${yamlStr(why)}`);
      return l;
    },
  },
};

async function runContent(key: string, limit: number, outDir: string, write: boolean, strict: boolean, full: boolean) {
  const spec = CONTENT_SPECS[key];
  if (!spec) { console.error(`unknown collection: ${key}`); process.exit(1); }

  /** filename -> file contents, written in one go once every page has rendered. */
  const rendered = new Map<string, string>();

  console.log('building relation lookups...');
  // Only *published* heuristics have a page on the site, so only those may be
  // referenced. Anything else is reported below rather than silently dropped —
  // Astro's reference() would fail the build on a slug that has no page.
  //
  // Two very different things hide behind "cannot resolve", and they are
  // reported separately: a heuristic that exists but is still being curated
  // (expected — it gets published when the curation is done), versus a
  // relation pointing at a page that is not in the database at all (deleted,
  // archived, or the wrong database — a real dangling reference).
  const heurSlug = new Map<string, string>();
  const heurPending = new Map<string, { title: string; status: string }>();
  let heurLookupOk = false;
  try {
    for (const p of await queryAll(HEURISTICS_DS)) {
      const id = (p.id as string).replace(/-/g, '');
      const slug = (p.properties?.Slug?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
      if (statusOf(p, 'status') === 'Published' && slug) heurSlug.set(id, slug);
      else heurPending.set(id, { title: plainTitle(p, 'Title') || slug || id, status: statusOf(p, 'status') ?? 'no status' });
    }
    heurLookupOk = true;
  } catch (e: any) {
    console.warn(`  ! heuristics not readable (${e.code ?? e.message}); heuristic relations left unresolved.`);
  }

  /** Relations to heuristics that exist but are not published yet. Expected. */
  const pending: { slug: string; prop: string; ref: string }[] = [];
  /** Relations that pointed at nothing renderable, per entry. */
  const dropped: { slug: string; prop: string; ref: string }[] = [];
  const personName = spec.needsPeople
    ? await buildLookup(PEOPLE_DS, 'people (organisers)', (p) => {
        const tp: any = Object.values(p.properties ?? {}).find((x: any) => x.type === 'title');
        return (tp?.title ?? []).map((t: any) => t.plain_text).join('').trim();
      })
    : new Map<string, string>();

  // Guests are a `reference()` in the schema, so this must resolve exactly the
  // way `runGuests` names its files: from the guest's name. A row with no name
  // has no entry; name the session in the report rather than writing a
  // reference the build would then fail on.
  const guests = spec.needsGuests
    ? await buildLookup(GUESTS_DS, 'session guests', (p) => plainTitle(p, 'Name'))
    : new Map<string, string>();
  /** Guest relations pointing at a row that produced no entry. */
  const guestless: { slug: string; ref: string }[] = [];

  const state = loadState();
  const was = state[key] ?? {};
  const now: Record<string, EntryState> = {};
  /** Slug changes, which are URL changes and therefore need a redirect. */
  const renamed: { from: string; to: string }[] = [];
  /** Addresses the editor asked to take down. */
  const retired: string[] = [];
  /** Pages that vanished without anyone saying they meant it. */
  const quarantined: { url: string; title: string }[] = [];
  /** Published, but with no slug — so there is no address to render them at. */
  const unrenderable: { url: string; title: string }[] = [];
  /** Generated files somebody changed by hand; refetched from Notion. */
  const edited: string[] = [];
  let reused = 0;

  const allRows = await queryAll(spec.dataSourceId);
  const pages = allRows.filter((p) => spec.liveStatuses.includes(statusOf(p, spec.statusKind)));
  /** Rows that are no longer published, by page id, so pruning can ask *why*. */
  const withdrawn = new Map<string, { title: string; retire: boolean }>(
    allRows.filter((p) => !pages.includes(p)).map((p) => [
      (p.id as string).replace(/-/g, ''),
      { title: plainTitle(p, spec.titleProp), retire: p.properties?.['Retire URL']?.checkbox === true },
    ]),
  );
  const targets = limit ? pages.slice(0, limit) : pages;
  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(`${key}: ${targets.length}${limit ? ` (of ${pages.length})` : ''} -> ${outDir}\n`);

  for (const page of targets) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const slug = (get(spec.slugProp)?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const title = plainTitle(page, spec.titleProp);
    // Published in Notion, but with nowhere to live. Skipping is right — there
    // is no address to build — but silently skipping is not: the editor thinks
    // this is on the site, and only they can give it a slug.
    if (!slug) {
      console.log(`  ! no slug, skipping "${title}"`);
      unrenderable.push({ title, url: page.url });
      continue;
    }
    const ctx: AssetCtx = { dir: assetDir, slug, count: 0 };
    const rel = (n: string) => (get(n)?.relation ?? []).map((r: any) => r.id.replace(/-/g, ''));

    const h: Helpers = {
      get,
      text: (n) => (get(n)?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim(),
      multi: (n) => (get(n)?.multi_select ?? []).map((o: any) => o.name),
      url: (n) => get(n)?.url ?? undefined,
      date: (n) => get(n)?.date?.start ?? undefined,
      num: (n) => (typeof get(n)?.number === 'number' ? get(n).number : undefined),
      select: (n) => get(n)?.select?.name ?? undefined,
      checkbox: (n) => get(n)?.checkbox === true,
      heur: (n) => rel(n).flatMap((id: string) => {
        const r = resolveRelation(id, heurSlug, heurPending);
        if (r.kind === 'resolved') return [r.slug];
        if (r.kind === 'pending') pending.push({ slug, prop: n, ref: `${r.title} (${r.status})` });
        // If the lookup itself failed there is nothing to be dangling against.
        else if (heurLookupOk) dropped.push({ slug, prop: n, ref: `unknown page ${id.slice(0, 8)}…` });
        return [];
      }),
      person: (n) => rel(n).map((id: string) => personName.get(id)).filter(Boolean) as string[],
      guest: (n) => rel(n).flatMap((id: string) => {
        const name = guests.get(id);
        if (name) return [kebab(name)];
        guestless.push({ slug, ref: `unknown page ${id.slice(0, 8)}…` });
        return [];
      }),
      img: async (n, label) => {
        const u = fileUrl((get(n)?.files ?? [])[0]);
        return u ? await downloadImage(u, ctx, label) : null;
      },
    };

    // Has this page's *content* changed? Its properties are already in hand
    // either way, so front matter is always rebuilt; only the body and the
    // downloaded image are worth skipping.
    const id = (page.id as string).replace(/-/g, '');
    const before = was[id];
    const editedAt = page.last_edited_time as string;
    const previous = before && !full ? readExisting(`${outDir}/${before.slug}.md`) : null;
    // Reuse the body only if Notion says the page has not changed *and* the
    // file is still the one we wrote. Someone editing generated content by
    // hand is not a merge conflict to resolve — Notion is the source of
    // truth, so the edit is simply replaced, and said out loud.
    // No recorded digest means we cannot vouch for what is on disk, so we
    // refetch rather than trust it. That costs one full sync the first time
    // this runs, and is the difference between a guard and a decoration.
    const untouched = !!previous && !!before!.hash && digest(previous.body) === before!.hash;
    const unchanged = !!previous && before!.edited === editedAt && untouched;
    if (previous && before?.edited === editedAt && !untouched) {
      edited.push(`${outDir}/${before.slug}.md`);
    }

    if (before && before.slug !== slug) renamed.push({ from: before.slug, to: slug });
    now[id] = { slug, edited: editedAt, hash: '' };

    const fm: string[] = ['---'];
    fm.push(`title: ${yamlStr(title)}`);
    fm.push(`slug: ${yamlStr(slug)}`);
    fm.push(`status: ${yamlStr(statusOf(page, spec.statusKind))}`);
    fm.push(...(await spec.extra(h)));
    if (spec.featuredImageProp) {
      const featuredRel = unchanged ? previous!.featured : await h.img(spec.featuredImageProp, 'featured');
      if (featuredRel) fm.push(`featuredImage: ${yamlStr(featuredRel)}`);
    }
    fm.push('---');

    const body = unchanged ? previous!.body : await blocksToMd(await childrenOf(page.id), ctx);
    if (unchanged) reused++;
    // Trailing blank lines are normalised here rather than in either branch,
    // so a body that was fetched and a body that was reused are byte-identical.
    // Without this a changed page would flip-flop on alternate syncs, and
    // "no diff, no deploy" would deploy nothing but whitespace.
    const finalBody = body.replace(/\n+$/, '');
    now[id].hash = digest(finalBody);
    rendered.set(`${slug}.md`, `${fm.join('\n')}\n\n${finalBody}\n`);
    if (!unchanged) console.log(`  ✓ ${slug}.md (${body.length}c, ${ctx.count} imgs)`);
  }

  // Write only once every page has rendered. A rate-limit or network failure
  // half-way through must not leave src/content/ in a state worth committing.
  for (const [name, content] of rendered) writeFileSync(`${outDir}/${name}`, content);

  // Prune entries this run did not produce — un-published in Notion, or renamed
  // (which leaves the old slug behind as a live page forever otherwise).
  // A --limit run only saw part of the collection, so it must never prune.
  //
  // A page that stops being published is three different situations, and only
  // the editor knows which. `Retire URL` is where they say so.
  //
  //   ticked      → they mean it. Delete the page and answer 410 Gone.
  //   not ticked  → keep serving it and tell somebody. An accidental
  //                 unpublish must not quietly 404 an address other people
  //                 have linked to, and it must not block everyone else's
  //                 publishing either.
  //   never live  → nothing to protect; just remove the file.
  //
  // A --limit run only saw part of the collection, so it must never prune.
  if (!limit) {
    const contract = liveUrlSet();
    const stale = readdirSync(outDir).filter((f) => f.endsWith('.md') && !rendered.has(f));
    for (const f of stale) {
      const gone = f.replace(/\.md$/, '');
      const url = `${spec.section}${gone}/`;
      const id = Object.keys(was).find((k) => was[k].slug === gone);
      const row = id ? withdrawn.get(id) : undefined;

      if (row?.retire || !contract.has(url)) {
        unlinkSync(`${outDir}/${f}`);
        if (contract.has(url)) {
          retired.push(url);
          console.log(`  – removed ${f} — retired on purpose, will answer 410`);
        } else {
          console.log(`  – removed ${f} (never had a public URL)`);
        }
        continue;
      }

      // Quarantined: keep the file, keep the page, raise it with a human.
      quarantined.push({ url, title: row?.title ?? gone });
      rendered.set(f, readFileSync(`${outDir}/${f}`, 'utf8'));
      if (id) now[id] = was[id];
      console.log(`  ! ${f} is no longer published in Notion but ${url} is a live URL — still serving it`);
    }

    // After the entries, so a quarantined page keeps its pictures.
    pruneAssets(outDir, 'image');
  }

  if (reused) console.log(`  · ${reused} unchanged, body reused (no fetch)`);

  if (edited.length) {
    console.log(`\n  ! ${edited.length} generated file(s) had been changed by hand; refetched from Notion:`);
    for (const f of edited) console.log(`      ${f}`);
    console.log('    Notion is the source of truth. Make the change there.');
  }

  if (renamed.length) {
    console.log(`\n  ! ${renamed.length} slug(s) changed, which changes a URL:`);
    for (const r of renamed) console.log(`      ${spec.section}${r.from}/ → ${spec.section}${r.to}/`);
    if (write) {
      recordRedirects(renamed.map((r) => ({
        from: `${spec.section}${r.from}/`, to: `${spec.section}${r.to}/`, kind: '301' as const,
      })));
      console.log('    Recorded in data/retired-urls.csv; the old address will 301 to the new one.');
    }
  }

  if (retired.length && write) {
    recordRedirects(retired.map((from) => ({ from, kind: '410' as const })));
    console.log(`\n  ${retired.length} address(es) retired; recorded as Gone in data/retired-urls.csv.`);
  }

  if (quarantined.length) {
    console.log(`\n  ! ${quarantined.length} page(s) unpublished in Notion without "Retire URL" ticked.`);
    console.log('    They are still being served, and nothing is blocked. Either republish them,');
    console.log('    or tick Retire URL to take the address down properly:');
    for (const q of quarantined) console.log(`      ${q.url}  (${q.title})`);
  }
  if (unrenderable.length) {
    console.log(`\n  ! ${unrenderable.length} page(s) published in Notion with no slug, so they have no address:`);
    for (const u of unrenderable) console.log(`      ${u.title}  ${u.url}`);
    console.log('    Nothing will render them until somebody fills the slug in.');
  }

  // Unconditional, so that resolving the last one empties the list rather than
  // leaving a stale alert for the pipeline to keep raising. A preview run is
  // not allowed to touch it, and a --limit run has not seen the whole database.
  if (write && !limit) {
    // A collection with no `section` still raises alerts worth seeing: a book
    // published without a slug renders no anchor, and a cover whose source has
    // gone is the failure that once wiped eight organiser photos. So the alert
    // file is keyed by the page these entries appear on, which for a non-routed
    // collection is the list page rather than a URL per entry. Only the rename
    // and redirect handling above is skipped when `section` is absent.
    const alertKey = spec.section ?? `/${key}/`;
    writeAlert(alertKey, [
      ...quarantined.map((q) => ({ kind: 'unpublished-but-live' as const, section: alertKey, title: q.title, url: q.url })),
      ...unrenderable.map((u) => ({ kind: 'published-without-a-slug' as const, section: alertKey, title: u.title, url: u.url })),
      ...strandedAlerts(alertKey),
    ]);
  }

  if (write && !limit) { state[key] = now; saveState(state); }

  if (seenUnhandled.size) console.log(`\n  unhandled block types seen: ${[...seenUnhandled].join(', ')}`);

  const list = (rows: { slug: string; prop: string; ref: string }[]) => {
    for (const r of rows.slice(0, 20)) console.log(`      ${r.slug} → ${r.prop}: ${r.ref}`);
    if (rows.length > 20) console.log(`      … and ${rows.length - 20} more`);
  };

  // Not an error: the heuristic exists, it is simply not curated yet. The link
  // appears by itself on the next sync after it is published, so this is
  // informational and --strict deliberately tolerates it.
  if (pending.length) {
    console.log(`\n  i ${pending.length} relation(s) point at heuristics still being curated; the link will appear once they are published:`);
    list(pending);
  }

  // Reported rather than fatal: the session still renders, minus that guest.
  if (guestless.length) {
    console.log(`\n  ! ${guestless.length} guest relation(s) resolved to nothing and were left out:`);
    list(guestless.map((g) => ({ slug: g.slug, prop: 'Guests', ref: g.ref })));
    console.log('    The row is missing from the Session Guests database, or has an empty Name.');
  }

  if (dropped.length) {
    console.log(`\n  ! ${dropped.length} relation(s) pointed at a page that is not in the heuristics database (deleted or archived) and were dropped:`);
    list(dropped);
    console.log('    Remove the relation in Notion, or restore the page.');
    if (strict) {
      console.error('\n  --strict: failing because of the dangling relations above.');
      process.exit(1);
    }
  }

  if (!write) console.log(`\n  (preview only — files in ${outDir}, nothing under src/content/)`);
}

// --- rows: Notion -> JSON data collections -----------------------------------
//
// Three databases, one shape: a row with no body, a picture, and some fields.
// The first two were hand-written functions duplicating the image download, the
// write loop and the pruning, because the table above only modelled
// collections with a markdown body. One table entry each now says what is
// different, which is all that ever was — and the third one cost a row rather
// than a fourth copy of the same loop.
//
// The people split is deliberate, and explained in docs/content-model.md:
// organisers is an
// operational database (who runs what), guests exists to make a good `Person`.
// Conferences are here rather than in CONTENT_SPECS because they have no page,
// no slug and no address of ours: the card *is* the content, and it links out.

interface RowSpec {
  dataSourceId: string;
  /** What to call this in the log. */
  label: string;
  /** URL section, when this row has a page of its own. Set it and a rename is
   *  treated as a URL change: a 301 is recorded and somebody is told. Leave it
   *  off and the file name is only a file name. */
  section?: string;
  /** The entry's file name — never a URL for guests, a URL for organisers. */
  slugOf: (name: string, h: RowHelpers) => string;
  fields: (name: string, h: RowHelpers) => Record<string, unknown>;
  /** Where the row's one picture comes from. Organisers and guests upload a
   *  file to Notion; a conference logo is a link to the conference's own asset,
   *  because it is their artwork and their server already serves it. */
  image: {
    of: (h: RowHelpers) => string | undefined;
    /** Names the file on disk (`<slug>-<label>.png`) and the log line. */
    label: string;
    /** The JSON field the relative path is written to. */
    key: string;
  };
  /** Anything this collection wants a person to look at. Only conferences have
   *  one so far: dates that have been and gone. */
  alerts?: (rows: Record<string, unknown>[]) => Alert[];
}

interface RowHelpers {
  text: (n: string) => string;
  url: (n: string) => string | undefined;
  select: (n: string) => string | undefined;
  multi: (n: string) => string[];
  checkbox: (n: string) => boolean;
  /** Start of a date property; `dateEnd` is the other end of a range. */
  date: (n: string) => string | undefined;
  dateEnd: (n: string) => string | undefined;
  /** First file attached to a files property, as a URL. */
  file: (n: string) => string | undefined;
}

const ROW_SPECS: Record<string, RowSpec> = {
  organisers: {
    dataSourceId: PEOPLE_DS,
    label: 'organisers',
    // An organiser has a page, so this slug *is* a URL: changing a name
    // changes an address and needs a redirect. `section` is what says so;
    // guests and conferences have none, because renaming those costs nothing.
    section: '/organisers/',
    slugOf: (name) => kebab(name),
    image: { of: (h) => h.file('Photo'), label: 'photo', key: 'photo' },
    fields: (name, h) => ({
      name,
      slug: kebab(name),
      role: h.text('Role') || undefined,
      website: h.url('URL'),
      linkedin: h.url('LinkedIn'),
      // Handles, the same as guests: see the note on the guests spec below.
      mastodon: h.text('Mastodon') || undefined,
      bluesky: h.text('Bluesky') || undefined,
      area: h.select('Area'),
      organises: h.multi('Organises'),
      showOnTeam: h.checkbox('Show on team'),
    }),
  },
  guests: {
    dataSourceId: GUESTS_DS,
    label: 'session guests',
    // A guest has no page: the file name exists only so a session's `guests`
    // relation resolves, so renaming one in Notion costs nothing.
    slugOf: (name) => kebab(name),
    image: { of: (h) => h.file('Photo'), label: 'photo', key: 'photo' },
    fields: (name, h) => ({
      name,
      bio: h.text('Bio') || undefined,
      website: h.url('Website'),
      // Guests name these three for what they hold: `LinkedIn Url`,
      // `Mastodon Tag`, `Bluesky Tag`. Organisers still say `LinkedIn`,
      // `Mastodon`, `Bluesky`, so the two specs read different names on
      // purpose. Renaming a property is invisible to the sync, because every
      // field here is optional: it writes the file without the field, commits
      // as the bot and deploys green.
      linkedin: h.url('LinkedIn Url'),
      // Text, not URL, on both people databases: these two hold a handle
      // (`@sebrose@mastodon.scot`) so the n8n social flows can put them in a
      // post, which is the only place a handle is wanted. `h.url` reads
      // Notion's `url` field and returns undefined for a text property, so
      // reading these the old way drops every handle without an error.
      mastodon: h.text('Mastodon Tag') || undefined,
      bluesky: h.text('Bluesky Tag') || undefined,
      alsoAnOrganiser: h.checkbox('Also an organiser'),
    }),
  },
  conferences: {
    dataSourceId: CONFERENCES_DS,
    label: 'conferences',
    slugOf: (name) => kebab(name),
    image: { of: (h) => h.url('Logo'), label: 'logo', key: 'logo' },
    fields: (name, h) => ({
      name,
      start: h.date('Dates'),
      end: h.dateEnd('Dates'),
      location: h.text('Location') || undefined,
      description: h.text('Description') || undefined,
      website: h.url('Website'),
      logoBackground: h.text('Logo background') || undefined,
      // Not written to the entry: it decides whether there is an entry at all.
      showOnSite: h.checkbox('Show on site'),
    }),
    // A conference recurs, so every date here goes stale on its own, without
    // anybody touching Notion. The card stops claiming the old dates by itself
    // — see src/lib/conferences.ts — but only a person can go and find the new
    // ones, so say so once, here, rather than waiting to be noticed.
    alerts: (rows) => rows
      .filter((r) => {
        const start = r.start as string | undefined;
        if (!start) return false;
        const end = r.end as string | undefined;
        return hasPassed(Date.parse(start), end ? Date.parse(end) : undefined, Date.now());
      })
      .map((r) => ({
        kind: 'dates-passed' as const,
        section: 'conferences',
        title: `${r.name} last ran ${r.end ?? r.start}, so its card now says no new dates are announced`,
        url: (r.website as string) ?? '',
      })),
  },
};

async function runRows(key: string, outDir: string, write: boolean) {
  const spec = ROW_SPECS[key];
  if (!spec) { console.error(`unknown row collection: ${key}`); process.exit(1); }

  const pages = await queryAll(spec.dataSourceId);
  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(`${spec.label}: ${pages.length} -> ${outDir}\n`);

  const written = new Set<string>();
  /** What was written, for the collection's own alert rule to read. */
  const rows: Record<string, unknown>[] = [];
  /** Slug per Notion row, kept only for a collection whose rows have pages. */
  const state = loadState();
  const was = state[key] ?? {};
  const now: Record<string, EntryState> = {};
  for (const page of pages) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const h: RowHelpers = {
      text: (n) => (get(n)?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim(),
      url: (n) => get(n)?.url ?? undefined,
      select: (n) => get(n)?.select?.name ?? undefined,
      multi: (n) => (get(n)?.multi_select ?? []).map((o: any) => o.name),
      checkbox: (n) => get(n)?.checkbox ?? false,
      date: (n) => get(n)?.date?.start ?? undefined,
      dateEnd: (n) => get(n)?.date?.end ?? undefined,
      file: (n) => fileUrl((get(n)?.files ?? [])[0]),
    };
    const titleProp: any = Object.values(P).find((x: any) => x.type === 'title');
    const name = (titleProp?.title ?? []).map((t: any) => t.plain_text).join('').trim();
    if (!name) { console.log(`  ! a ${spec.label} row has no name, skipping`); continue; }

    const slug = spec.slugOf(name, h);
    if (spec.section) now[page.id.replace(/-/g, '')] = { slug };
    const file = `${slug}.json`;
    if (written.has(file)) {
      console.log(`  ! two rows are both named "${name}"; keeping the first. Rename one in Notion.`);
      continue;
    }

    const data: Record<string, unknown> = { ...spec.fields(name, h) };
    // A publish gate, like every other collection's, but spelled as a field so
    // the table stays a table. Taking a conference off the site is a tick, not
    // a deletion, so the row and its dates survive to be put back.
    if (data.showOnSite === false) { delete data.showOnSite; continue; }
    delete data.showOnSite;

    const ctx: AssetCtx = { dir: assetDir, slug, count: 0 };
    const imgUrl = spec.image.of(h);
    const img = imgUrl ? await downloadImage(imgUrl, ctx, spec.image.label) : null;
    data[spec.image.key] = img ?? undefined;

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    written.add(file);
    rows.push(data);
    writeFileSync(`${outDir}/${file}`, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${file}${img ? ` (${spec.image.label})` : ''}`);
  }

  // A row deleted or renamed in Notion must not leave an entry behind: a
  // session relation resolves to the new name, and the old file would linger.
  for (const f of readdirSync(outDir).filter((f) => f.endsWith('.json') && !written.has(f))) {
    unlinkSync(`${outDir}/${f}`);
    console.log(`  – removed ${f} (no longer in the database)`);
  }
  pruneAssets(outDir, spec.image.label);

  // A row whose slug changed is a page that moved. Nothing else notices: a
  // person has no `Retire URL` checkbox, and the run that renamed them is the
  // only thing that ever knew both addresses. So the run that breaks the URL
  // is the run that keeps the promise, exactly as the content sync does.
  const moved = movedSlugs(was, now);

  for (const m of moved) {
    console.log(`  → ${m.from} is now ${m.to}; recording a redirect`);
  }

  if (write && spec.section) {
    recordRedirects(moved.map((m) => ({
      from: `${spec.section}${m.from}/`,
      to: `${spec.section}${m.to}/`,
      kind: '301' as const,
    })));
    state[key] = now;
    saveState(state);
  }

  // Unconditional, like the content sync's: re-uploading the last picture in
  // Notion has to be able to empty this list, not just stop adding to it.
  if (write) writeAlert(spec.label, [
    ...strandedAlerts(spec.label),
    ...(spec.alerts?.(rows) ?? []),
    ...moved.map((m) => ({
      kind: 'person-renamed' as const,
      section: spec.section!,
      title: `${m.from} → ${m.to}`,
      url: `https://virtualddd.com${spec.section}${m.to}/`,
    })),
  ]);

  if (!write) console.log(`\n  (preview only — files in ${outDir})`);
}

// --- ddd-crew command: the section's shape, as one config file --------------
//
// Not a collection: no page is generated here and nothing is written under
// src/content/. This writes the *instruction* that scripts/sync-ddd-crew.ts
// then carries out — which repos to fetch a README from, and which to link out
// to — and that /ddd-crew/ reads to lay the gallery out. See scripts/lib/ddd-crew.ts.

async function runDddCrew(write: boolean) {
  const [pages, schema] = await Promise.all([
    queryAll(DDD_CREW_DS),
    api('ddd-crew schema', () => notion.dataSources.retrieve({ data_source_id: DDD_CREW_DS })) as Promise<any>,
  ]);

  // Notion returns a select's options in the order they are shown, so dragging
  // a category in the property editor reorders the gallery. Keeping the order
  // here is what lets /ddd-crew/ stop holding a hardcoded list of four
  // categories — a list that silently dropped every tool in a fifth one.
  const categories: string[] = (schema.properties?.Category?.select?.options ?? []).map((o: any) => o.name);

  const tools: CrewTool[] = [];
  const seen = new Set<string>();
  let unpublished = 0;
  const skipped: string[] = [];

  for (const page of pages) {
    const P = page.properties ?? {};
    const text = (n: string) => (P[n]?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const name = plainTitle(page, 'Name');

    if (statusOf(page, 'select') !== 'Published') { unpublished++; continue; }

    const repo = text('Repo').toLowerCase();
    if (!repo) { skipped.push(`${name || page.id} (no Repo, so it has no address and no README to fetch)`); continue; }
    if (seen.has(repo)) { skipped.push(`${name} (a second row for ddd-crew/${repo}; keeping the first)`); continue; }
    seen.add(repo);

    const category = P.Category?.select?.name ?? '';
    if (category && !categories.includes(category)) categories.push(category);

    tools.push({
      repo,
      name: name || repo,
      // Derived rather than demanded: the repo name is the whole of the URL,
      // and a link-out row with an empty Link would otherwise be a card that
      // goes nowhere.
      link: P.Link?.url || `https://github.com/ddd-crew/${repo}`,
      republished: P.Republished?.checkbox ?? false,
      category,
      order: P.Order?.number ?? 0,
      note: text('Why it is worth it') || undefined,
    });
  }

  // Never write an empty section. Notion answering with nothing — a token that
  // lost access, the wrong database, a filter left on a view — would otherwise
  // delete every republished page in the same run that could not read them.
  if (!tools.length) {
    throw new Error(`${DDD_CREW_DS} returned no published rows. Refusing to write an empty ${CREW_CONFIG_FILE}: that would take the whole /ddd-crew/ section down.`);
  }

  const config: CrewConfig = { categories, tools: [] };
  config.tools = byGallery({ categories, tools });

  const republished = config.tools.filter((t) => t.republished).length;
  console.log(`ddd-crew: ${config.tools.length} tools (${republished} republished, ${config.tools.length - republished} linked out) in ${categories.length} categories`);
  for (const t of config.tools) {
    console.log(`  ${t.republished ? '✓' : '↗'} ${t.category} ${t.order} — ${t.repo}`);
  }
  if (unpublished) console.log(`  · ${unpublished} row(s) not Published, so not on the site`);
  for (const s of skipped) console.log(`  ! ${s}`);

  // No timestamp in the file, deliberately: the sync deploys when its own diff
  // says something changed, and a line that changes every hour would deploy the
  // site every hour to publish nothing.
  if (write) {
    writeFileSync(CREW_CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
    console.log(`\nWrote ${CREW_CONFIG_FILE}. Run sync:ddd-crew to fetch the READMEs.`);
  } else {
    console.log(`\n  (preview only — pass --write to update ${CREW_CONFIG_FILE})`);
  }
}

// --- dispatch ---------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const write = args.includes('--write');
  const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

  if (cmd === 'ddd-crew') return runDddCrew(write);
  if (cmd === 'organisers' || cmd === 'guests' || cmd === 'conferences') {
    const dir = cmd === 'guests' ? 'session-guests' : cmd;
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? `src/content/${dir}` : `preview/${dir}`);
    return runRows(cmd, outDir, write);
  }
  if (cmd === 'content') {
    const target = only ?? 'sessions';
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? `src/content/${target}` : `preview/${target}`);
    return runContent(target, limit, outDir, write, args.includes('--strict'), args.includes('--full'));
  }
  console.error('usage:\n  tsx scripts/sync-notion.ts content --collection=<sessions|open-spaces|stories|heuristics> [--limit=N] [--write] [--strict] [--full]\n  tsx scripts/sync-notion.ts organisers [--write]\n  tsx scripts/sync-notion.ts guests [--write]\n  tsx scripts/sync-notion.ts conferences [--write]\n  tsx scripts/sync-notion.ts ddd-crew [--write]\n\n  --full    re-fetch every body, ignoring data/sync-state.json\n  --strict  exit non-zero on a dangling relation — one pointing at a page that\n            is not in the heuristics database. Relations to heuristics that are\n            merely awaiting curation are reported but tolerated.');
  process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
