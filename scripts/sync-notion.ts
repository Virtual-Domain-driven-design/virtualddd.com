/**
 * Notion → src/content/. The script the whole publishing loop rests on.
 *
 *   content --collection=<name>   pages to markdown
 *   organisers                    the team, as JSON
 *   guests                        session speakers, as JSON
 *
 * Nothing here is hand-edited afterwards: Notion is the source of truth and
 * this is the only writer. Add --write to land files under src/content/;
 * without it everything goes to a preview directory instead.
 *
 * See AGENTS.md, "Content model".
 */
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import {
  createBlocksToMd, assetRefs, fileUrl, isAssetFor, kebab, plainTitle,
  resolveRelation, statusOf, yamlList, yamlStr,
  type AssetCtx, type StatusKind,
} from './lib/notion-md';

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
  /** Notion's `last_edited_time` when we last rendered this body. */
  edited: string;
  /** Digest of the body we wrote, so an edit made here rather than in Notion
   *  is noticed and refetched instead of being quietly kept. */
  hash: string;
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
   *  an editor can re-upload it. */
  kind: 'unpublished-but-live' | 'published-without-a-slug' | 'image-source-gone';
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

const EXT_BY_CT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
};
function extFromUrl(url: string): string | null {
  const path = url.split('?')[0];
  const m = path.match(/\.([a-z0-9]{2,4})$/i);
  return m ? m[1].toLowerCase() : null;
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
const strandedImages: { slug: string; label: string; url: string }[] = [];

/** What this run had to keep, as alerts for the section being synced. */
const strandedAlerts = (section: string): Alert[] =>
  strandedImages.map((s) => ({
    kind: 'image-source-gone' as const,
    section,
    title: `${s.slug} (${s.label})`,
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
    const ext = extFromUrl(url) ?? EXT_BY_CT[res.headers.get('content-type') ?? ''] ?? 'png';
    const buf = await shrinkImage(raw, ext);
    const name = `${ctx.slug}-${label}.${ext}`;
    mkdirSync(ctx.dir, { recursive: true });
    writeFileSync(`${ctx.dir}/${name}`, buf);
    return `./_assets/${name}`;
  } catch (e: any) {
    const kept = existingAsset(ctx.dir, ctx.slug, label);
    if (kept) {
      console.warn(`    ! image source gone (${label}): ${e.message} — keeping ${kept}`);
      strandedImages.push({ slug: ctx.slug, label, url });
      return `./_assets/${kept}`;
    }
    console.warn(`    ! image download failed (${label}): ${e.message}`);
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
  heur: (n: string) => string[];
  person: (n: string) => string[];
  guest: (n: string) => string[];
  img: (n: string, label: string) => Promise<string | null>;
}

interface ContentSpec {
  dataSourceId: string;
  /** URL section, so a rename can be turned into a redirect. */
  section: string;
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
      const tags = h.multi('Tags'); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['video', 'Video'], ['podcastPlayer', 'PodcastPlayer'], ['miro', 'Miro'], ['meet', 'Meet'], ['humantix', 'Humantix']] as const) {
        const u = h.url(p); if (u) l.push(`${k}: ${yamlStr(u)}`);
      }
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
      const tags = h.multi('Tags'); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
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
    extra: async (h) => {
      const l: string[] = [];
      const ep = h.num('Episode'); if (ep != null) l.push(`episode: ${ep}`);
      const pd = h.date('Published Date'); if (pd) l.push(`publishedDate: ${pd.slice(0, 10)}`);
      const authors = h.multi('Authors'); if (authors.length) l.push(`authors: ${yamlList(authors)}`);
      const tags = h.multi('Tags'); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
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
      const tags = h.multi('Tags'); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['competesWith', 'Competes With'], ['complements', 'Complements'], ['enables', 'Enables'], ['prerequisites', 'Prerequisites '], ['specializes', 'Specializes']] as const) {
        const v = h.heur(p); if (v.length) l.push(`${k}: ${yamlList(v)}`);
      }
      const md = h.text('Meta Description'); if (md) l.push(`metaDescription: ${yamlStr(md)}`);
      const st = h.text('SEO Title'); if (st) l.push(`seoTitle: ${yamlStr(st)}`);
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
    writeAlert(spec.section, [
      ...quarantined.map((q) => ({ kind: 'unpublished-but-live' as const, section: spec.section, title: q.title, url: q.url })),
      ...unrenderable.map((u) => ({ kind: 'published-without-a-slug' as const, section: spec.section, title: u.title, url: u.url })),
      ...strandedAlerts(spec.section),
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

// --- people: Notion -> JSON data collections --------------------------------
//
// Two databases, one shape: a row with no body, a portrait, and some links.
// They were two hand-written functions duplicating the image download, the
// write loop and the pruning, because the table above only modelled
// collections with a markdown body. One table entry each now says what is
// different, which is all that ever was.
//
// The split itself is deliberate, and explained in AGENTS.md: organisers is an
// operational database (who runs what), guests exists to make a good `Person`.

interface PeopleSpec {
  dataSourceId: string;
  /** What to call this in the log. */
  label: string;
  /** The entry's file name — never a URL for guests, a URL for organisers. */
  slugOf: (name: string, h: PeopleHelpers) => string;
  fields: (name: string, h: PeopleHelpers) => Record<string, unknown>;
}

interface PeopleHelpers {
  text: (n: string) => string;
  url: (n: string) => string | undefined;
  select: (n: string) => string | undefined;
  multi: (n: string) => string[];
  checkbox: (n: string) => boolean;
}

const PEOPLE_SPECS: Record<string, PeopleSpec> = {
  organisers: {
    dataSourceId: PEOPLE_DS,
    label: 'organisers',
    // An organiser has a page, so this slug *is* a URL: changing a name
    // changes an address and needs a redirect.
    slugOf: (name) => kebab(name),
    fields: (name, h) => ({
      name,
      slug: kebab(name),
      role: h.text('Role') || undefined,
      website: h.url('URL'),
      linkedin: h.url('LinkedIn'),
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
    fields: (name, h) => ({
      name,
      bio: h.text('Bio') || undefined,
      website: h.url('Website'),
      linkedin: h.url('LinkedIn'),
      mastodon: h.url('Mastodon'),
      bluesky: h.url('Bluesky'),
      alsoAnOrganiser: h.checkbox('Also an organiser'),
    }),
  },
};

async function runPeople(key: string, outDir: string, write: boolean) {
  const spec = PEOPLE_SPECS[key];
  if (!spec) { console.error(`unknown people collection: ${key}`); process.exit(1); }

  const pages = await queryAll(spec.dataSourceId);
  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(`${spec.label}: ${pages.length} -> ${outDir}\n`);

  const written = new Set<string>();
  for (const page of pages) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const h: PeopleHelpers = {
      text: (n) => (get(n)?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim(),
      url: (n) => get(n)?.url ?? undefined,
      select: (n) => get(n)?.select?.name ?? undefined,
      multi: (n) => (get(n)?.multi_select ?? []).map((o: any) => o.name),
      checkbox: (n) => get(n)?.checkbox ?? false,
    };
    const titleProp: any = Object.values(P).find((x: any) => x.type === 'title');
    const name = (titleProp?.title ?? []).map((t: any) => t.plain_text).join('').trim();
    if (!name) { console.log(`  ! a ${spec.label} row has no name, skipping`); continue; }

    const slug = spec.slugOf(name, h);
    const file = `${slug}.json`;
    if (written.has(file)) {
      console.log(`  ! two rows are both named "${name}"; keeping the first. Rename one in Notion.`);
      continue;
    }

    const ctx: AssetCtx = { dir: assetDir, slug, count: 0 };
    const photoUrl = fileUrl((get('Photo')?.files ?? [])[0]);
    const photo = photoUrl ? await downloadImage(photoUrl, ctx, 'photo') : null;

    const data: Record<string, unknown> = { ...spec.fields(name, h), photo: photo ?? undefined };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    written.add(file);
    writeFileSync(`${outDir}/${file}`, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${file}${photo ? ' (photo)' : ''}`);
  }

  // A row deleted or renamed in Notion must not leave an entry behind: a
  // session relation resolves to the new name, and the old file would linger.
  for (const f of readdirSync(outDir).filter((f) => f.endsWith('.json') && !written.has(f))) {
    unlinkSync(`${outDir}/${f}`);
    console.log(`  – removed ${f} (no longer in the database)`);
  }
  pruneAssets(outDir, 'photo');

  // Unconditional, like the content sync's: re-uploading the last picture in
  // Notion has to be able to empty this list, not just stop adding to it.
  if (write) writeAlert(spec.label, strandedAlerts(spec.label));

  if (!write) console.log(`\n  (preview only — files in ${outDir})`);
}

// --- dispatch ---------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const write = args.includes('--write');
  const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

  if (cmd === 'organisers' || cmd === 'guests') {
    const dir = cmd === 'guests' ? 'session-guests' : 'organisers';
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? `src/content/${dir}` : `preview/${dir}`);
    return runPeople(cmd, outDir, write);
  }
  if (cmd === 'content') {
    const target = only ?? 'sessions';
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? `src/content/${target}` : `preview/${target}`);
    return runContent(target, limit, outDir, write, args.includes('--strict'), args.includes('--full'));
  }
  console.error('usage:\n  tsx scripts/sync-notion.ts content --collection=<sessions|open-spaces|stories|heuristics> [--limit=N] [--write] [--strict] [--full]\n  tsx scripts/sync-notion.ts organisers [--write]\n  tsx scripts/sync-notion.ts guests [--write]\n\n  --full    re-fetch every body, ignoring data/sync-state.json\n  --strict  exit non-zero on a dangling relation — one pointing at a page that\n            is not in the heuristics database. Relations to heuristics that are\n            merely awaiting curation are reported but tolerated.');
  process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
