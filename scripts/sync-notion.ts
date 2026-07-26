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
import sharp from 'sharp';
import {
  createBlocksToMd, fileUrl, kebab, plainTitle,
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

import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';

const PEOPLE_DS = 'cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6'; // Sessions Organiser/Co-Organisers
const GUESTS_DS = 'd82910e0-cac0-46f8-8a20-cb3a3376d5eb'; // Sessions Guests (speakers, panellists)
const HEURISTICS_DS = 'e7743290-3850-404e-ae98-23a4caf0488e';

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

/** Download an image next to the entry; return the `./` relative path or null. */
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
      const fk = h.text('Focus keyphrase'); if (fk) l.push(`focusKeyphrase: ${yamlStr(fk)}`);
      const t = h.text('SEO Title'); if (t) l.push(`seoTitle: ${yamlStr(t)}`);
      const d = h.text('SEO Metadescription'); if (d) l.push(`seoMetadescription: ${yamlStr(d)}`);
      const sq = await h.img('Featured image squared', 'featured-squared'); if (sq) l.push(`featuredImageSquared: ${yamlStr(sq)}`);
      return l;
    },
  },
  heuristics: {
    dataSourceId: HEURISTICS_DS,
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
      const fk = h.text('Focus Keyphrase'); if (fk) l.push(`focusKeyphrase: ${yamlStr(fk)}`);
      const md = h.text('Meta Description'); if (md) l.push(`metaDescription: ${yamlStr(md)}`);
      const st = h.text('SEO Title'); if (st) l.push(`seoTitle: ${yamlStr(st)}`);
      return l;
    },
  },
};

async function runContent(key: string, limit: number, outDir: string, write: boolean, strict: boolean) {
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

  const pages = (await queryAll(spec.dataSourceId)).filter((p) => spec.liveStatuses.includes(statusOf(p, spec.statusKind)));
  const targets = limit ? pages.slice(0, limit) : pages;
  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(`${key}: ${targets.length}${limit ? ` (of ${pages.length})` : ''} -> ${outDir}\n`);

  for (const page of targets) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const slug = (get(spec.slugProp)?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const title = plainTitle(page, spec.titleProp);
    if (!slug) { console.log(`  ! no slug, skipping "${title}"`); continue; }
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

    const fm: string[] = ['---'];
    fm.push(`title: ${yamlStr(title)}`);
    fm.push(`slug: ${yamlStr(slug)}`);
    fm.push(`status: ${yamlStr(statusOf(page, spec.statusKind))}`);
    fm.push(...(await spec.extra(h)));
    if (spec.featuredImageProp) {
      const featuredRel = await h.img(spec.featuredImageProp, 'featured');
      if (featuredRel) fm.push(`featuredImage: ${yamlStr(featuredRel)}`);
    }
    fm.push('---');

    const body = await blocksToMd(await childrenOf(page.id), ctx);
    rendered.set(`${slug}.md`, fm.join('\n') + '\n\n' + body + '\n');
    console.log(`  ✓ ${slug}.md (${body.length}c, ${ctx.count} imgs)`);
  }

  // Write only once every page has rendered. A rate-limit or network failure
  // half-way through must not leave src/content/ in a state worth committing.
  for (const [name, content] of rendered) writeFileSync(`${outDir}/${name}`, content);

  // Prune entries this run did not produce — un-published in Notion, or renamed
  // (which leaves the old slug behind as a live page forever otherwise).
  // A --limit run only saw part of the collection, so it must never prune.
  if (!limit) {
    const stale = readdirSync(outDir).filter((f) => f.endsWith('.md') && !rendered.has(f));
    for (const f of stale) {
      unlinkSync(`${outDir}/${f}`);
      console.log(`  – removed ${f} (no longer published)`);
    }
  }

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

// --- organisers command: Notion -> JSON data collection ---------------------

async function runOrganisers(outDir: string, write: boolean) {
  const pages = await queryAll(PEOPLE_DS); // the "Virtual DDD Organisers" data source
  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(`organisers: ${pages.length} -> ${outDir}\n`);

  for (const page of pages) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const titleProp: any = Object.values(P).find((x: any) => x.type === 'title');
    const name = (titleProp?.title ?? []).map((t: any) => t.plain_text).join('').trim();
    if (!name) continue;
    const slug = kebab(name);
    const ctx: AssetCtx = { dir: assetDir, slug, count: 0 };
    const photoUrl = fileUrl((get('Photo')?.files ?? [])[0]);
    const photo = photoUrl ? await downloadImage(photoUrl, ctx, 'photo') : null;

    const data: Record<string, unknown> = {
      name,
      slug,
      role: (get('Role')?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim() || undefined,
      website: get('URL')?.url ?? undefined,
      linkedin: get('LinkedIn')?.url ?? undefined,
      area: get('Area')?.select?.name ?? undefined,
      organises: (get('Organises')?.multi_select ?? []).map((o: any) => o.name),
      showOnTeam: get('Show on team')?.checkbox ?? false,
      photo: photo ?? undefined,
    };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    writeFileSync(`${outDir}/${slug}.json`, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${slug}.json${photo ? ' (photo)' : ''}${data.showOnTeam ? ' [team]' : ''}`);
  }
  if (!write) console.log(`\n  (preview only — files in ${outDir})`);
}

// --- guests command: Notion -> JSON data collection -------------------------
//
// Session guests are the speakers and panellists, kept apart from the
// organisers database on purpose (see AGENTS.md): none of the operational
// fields — Discord, virtualddd.com mail — apply to an external speaker. The
// fields here exist to make a good `Person`, and the links become `sameAs`.
//
// A guest has **no slug and no page** — the entry exists to hold the bio and
// the links that become `sameAs`, and its file name is derived from the name
// purely so a session's `Guests` relation has something to resolve to. Nothing
// here is ever a URL, so a guest renamed in Notion just renames the entry.

async function runGuests(outDir: string, write: boolean) {
  const pages = await queryAll(GUESTS_DS);
  const assetDir = `${outDir}/_assets`;
  mkdirSync(outDir, { recursive: true });
  console.log(`session guests: ${pages.length} -> ${outDir}\n`);

  const written = new Set<string>();
  for (const page of pages) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const text = (n: string) => (get(n)?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const name = plainTitle(page, 'Name');
    if (!name) { console.log('  ! a guest row has no name, skipping'); continue; }
    const slug = kebab(name);
    if (written.has(`${slug}.json`)) {
      console.log(`  ! two guests are both named "${name}"; keeping the first. Rename one in Notion.`);
      continue;
    }
    const ctx: AssetCtx = { dir: assetDir, slug, count: 0 };
    const photoUrl = fileUrl((get('Photo')?.files ?? [])[0]);
    const photo = photoUrl ? await downloadImage(photoUrl, ctx, 'photo') : null;

    const data: Record<string, unknown> = {
      name,
      bio: text('Bio') || undefined,
      website: get('Website')?.url ?? undefined,
      linkedin: get('LinkedIn')?.url ?? undefined,
      mastodon: get('Mastodon')?.url ?? undefined,
      bluesky: get('Bluesky')?.url ?? undefined,
      alsoAnOrganiser: get('Also an organiser')?.checkbox ?? false,
      photo: photo ?? undefined,
    };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const file = `${slug}.json`;
    written.add(file);
    writeFileSync(`${outDir}/${file}`, JSON.stringify(data, null, 2) + '\n');
    console.log(`  ✓ ${file}${photo ? ' (photo)' : ''}${data.alsoAnOrganiser ? ' [organiser too]' : ''}`);
  }

  // A guest deleted or re-slugged in Notion must not leave an entry behind: a
  // session relation resolves to the new slug, and the old file would linger
  // as a person nobody can reach.
  for (const f of readdirSync(outDir).filter((f) => f.endsWith('.json') && !written.has(f))) {
    unlinkSync(`${outDir}/${f}`);
    console.log(`  – removed ${f} (no longer in the guests database)`);
  }

  if (!write) console.log(`\n  (preview only — files in ${outDir})`);
}

// --- dispatch ---------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const write = args.includes('--write');
  const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

  if (cmd === 'organisers') {
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? 'src/content/organisers' : 'migration-source/preview/organisers');
    return runOrganisers(outDir, write);
  }
  if (cmd === 'guests') {
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? 'src/content/session-guests' : 'migration-source/preview/session-guests');
    return runGuests(outDir, write);
  }
  if (cmd === 'content') {
    const target = only ?? 'sessions';
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? `src/content/${target}` : `migration-source/preview/${target}`);
    return runContent(target, limit, outDir, write, args.includes('--strict'));
  }
  console.error('usage:\n  tsx scripts/sync-notion.ts content --collection=<sessions|open-spaces|stories|heuristics> [--limit=N] [--write] [--strict]\n  tsx scripts/sync-notion.ts organisers [--write]\n  tsx scripts/sync-notion.ts guests [--write]\n\n  --strict  exit non-zero on a dangling relation — one pointing at a page that\n            is not in the heuristics database. Relations to heuristics that are\n            merely awaiting curation are reported but tolerated.');
  process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
