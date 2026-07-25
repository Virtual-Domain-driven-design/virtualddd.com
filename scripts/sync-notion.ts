/**
 * Notion sync (Phase 3).
 *
 * Subcommands:
 *   slugs            Match Sessions/Open Spaces to their WordPress slug and
 *                    (optionally) write the `slug` property back to Notion.
 *                    Read-only unless --write is passed.
 *
 * Flags:
 *   --dry-run        Print the proposed mapping; write nothing. (default)
 *   --write          Actually write the matched slugs into Notion.
 *   --collection=X   Limit to one collection (sessions | open-spaces).
 *
 * Slug source of truth: migration-source/derived/*.csv, derived from the
 * WordPress WXR export. See MIGRATION.md Phase 1/3 and CLAUDE.md.
 */
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import sharp from 'sharp';

dotenv.config({ path: 'local.env' });

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN missing (expected in local.env).');
  process.exit(1);
}
const notion = new Client({ auth: token });

// --- collection config ------------------------------------------------------

type StatusKind = 'select' | 'status';

interface CollectionCfg {
  dataSourceId: string;
  titleProp: string;
  statusProp: string;
  statusKind: StatusKind;
  /** Statuses whose rows have a live WordPress URL (need a preserved slug). */
  liveStatuses: string[];
  /** WXR-derived slug file. */
  derivedCsv: string;
}

const COLLECTIONS: Record<string, CollectionCfg> = {
  sessions: {
    dataSourceId: '33e9db0a-1418-4a3e-a053-33fa384e5e93',
    titleProp: 'Name',
    statusProp: 'Status',
    statusKind: 'select',
    liveStatuses: ['Done', 'Published'],
    derivedCsv: 'migration-source/derived/sessions.csv',
  },
  'open-spaces': {
    dataSourceId: '0cfb73c7-a638-4948-a4df-5fe06dcd2dd1',
    titleProp: 'Name',
    statusProp: 'Status',
    statusKind: 'status',
    liveStatuses: ['Published', 'Done'],
    derivedCsv: 'migration-source/derived/open-space.csv',
  },
};

// --- helpers ----------------------------------------------------------------

/** Normalise a title the same way the WXR CSV `norm` column was built. */
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Minimal CSV reader for the derived files (no embedded newlines/quotes). */
function readCsv(path: string): Record<string, string>[] {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.length);
  const header = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ''));
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function plainTitle(page: any, prop: string): string {
  const p = page.properties?.[prop];
  return (p?.title ?? []).map((t: any) => t.plain_text).join('').trim();
}

function statusName(page: any, cfg: CollectionCfg): string {
  const p = page.properties?.[cfg.statusProp];
  return (cfg.statusKind === 'select' ? p?.select?.name : p?.status?.name) ?? '';
}

function existingSlug(page: any): string {
  const p = page.properties?.['slug'];
  return (p?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
}

async function queryAll(dataSourceId: string): Promise<any[]> {
  const rows: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    });
    rows.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return rows;
}

// --- slug matching ----------------------------------------------------------

interface Match {
  pageId: string;
  name: string;
  status: string;
  existing: string;
  proposed: string | null;
  note: string;
}

async function matchSlugs(name: string, cfg: CollectionCfg): Promise<Match[]> {
  const wp = readCsv(cfg.derivedCsv);
  const byNorm = new Map<string, string[]>(); // norm -> [slug,...]
  for (const r of wp) {
    const arr = byNorm.get(r.norm) ?? [];
    arr.push(r.slug);
    byNorm.set(r.norm, arr);
  }

  const pages = await queryAll(cfg.dataSourceId);
  const matches: Match[] = [];
  for (const page of pages) {
    const title = plainTitle(page, cfg.titleProp);
    const status = statusName(page, cfg);
    const live = cfg.liveStatuses.includes(status);
    const existing = existingSlug(page);

    let proposed: string | null = null;
    let note = '';
    if (!live) {
      note = 'not live (no WordPress URL) — skip';
    } else {
      const hits = byNorm.get(norm(title)) ?? [];
      if (hits.length === 1) {
        proposed = hits[0];
        note = existing && existing !== proposed ? `differs from existing "${existing}"` : 'ok';
      } else if (hits.length === 0) {
        note = 'NO WP MATCH — needs manual slug';
      } else {
        note = `AMBIGUOUS — ${hits.length} WP matches`;
      }
    }
    matches.push({ pageId: page.id, name: title, status, existing, proposed, note });
  }
  return matches;
}

// --- slugs command ----------------------------------------------------------

async function runSlugs(only: string | undefined, write: boolean) {
  const targets = only ? [only] : Object.keys(COLLECTIONS);
  for (const key of targets) {
    const cfg = COLLECTIONS[key];
    if (!cfg) { console.error(`unknown collection: ${key}`); continue; }

    const matches = await matchSlugs(key, cfg);
    const live = matches.filter((m) => !m.note.startsWith('not live'));
    const ok = live.filter((m) => m.proposed && (m.note === 'ok' || m.note.startsWith('differs')));
    const problems = live.filter((m) => !m.proposed);

    console.log(`\n=== ${key} (${cfg.derivedCsv}) ===`);
    console.log(`live rows: ${live.length} | matched: ${ok.length} | problems: ${problems.length}`);

    for (const m of live) {
      const flag = m.proposed ? (m.note.startsWith('differs') ? '~' : '✓') : '✗';
      console.log(`  ${flag} ${m.proposed ?? '(none)'}   ⟵ "${m.name}"  [${m.status}]${m.note === 'ok' ? '' : '  — ' + m.note}`);
    }

    if (problems.length) {
      console.log(`\n  ${problems.length} row(s) need attention before writing.`);
    }

    if (write) {
      const toWrite = ok.filter((m) => m.existing !== m.proposed);
      console.log(`\n  --write: updating ${toWrite.length} row(s) in Notion...`);
      for (const m of toWrite) {
        await notion.pages.update({
          page_id: m.pageId,
          properties: { slug: { rich_text: [{ text: { content: m.proposed! } }] } },
        });
        console.log(`    wrote ${m.proposed}`);
      }
      console.log('  done.');
    } else {
      console.log('\n  (dry-run — nothing written. Re-run with --write to apply.)');
    }
  }
}

// --- content command: Notion pages -> markdown ------------------------------
//
// Hand-rolled block -> markdown converter (v5 data-source API compatible).
// Preserves embeds/callouts, which the plan calls out as easy to lose.
// First slice: sessions. Writes to a preview dir under --dry-run so fidelity
// can be inspected before anything lands in src/content/.

import { mkdirSync, writeFileSync } from 'node:fs';

const PEOPLE_DS = 'cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6'; // Sessions Organiser/Co-Organisers
const HEURISTICS_DS = 'e7743290-3850-404e-ae98-23a4caf0488e';

/** id -> value maps for relation resolution (page IDs are stored dashless-agnostic). */
async function buildLookup(dataSourceId: string, label: string, valueOf: (page: any) => string) {
  const map = new Map<string, string>();
  try {
    for (const page of await queryAll(dataSourceId)) {
      map.set((page.id as string).replace(/-/g, ''), valueOf(page));
    }
  } catch (e: any) {
    console.warn(`  ! ${label} not readable (${e.code ?? e.message}); relation left unresolved. Share that database with the integration to fix.`);
  }
  return map;
}

function richText(rts: any[] = []): string {
  return rts.map((rt) => {
    let t = rt.plain_text ?? '';
    const a = rt.annotations ?? {};
    if (a.code) t = '`' + t + '`';
    if (a.bold) t = `**${t}**`;
    if (a.italic) t = `*${t}*`;
    if (a.strikethrough) t = `~~${t}~~`;
    const href = rt.href ?? rt.text?.link?.url;
    if (href) t = `[${t}](${href})`;
    return t;
  }).join('');
}

function fileUrl(f: any): string {
  return f?.type === 'external' ? f.external?.url : f?.file?.url ?? '';
}

interface AssetCtx { dir: string; slug: string; count: number }

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

async function childrenOf(blockId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, page_size: 100, start_cursor: cursor });
    out.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return out;
}

const seenUnhandled = new Set<string>();

/** Render a list of blocks to markdown. `indent` handles nested lists. */
async function blocksToMd(blocks: any[], ctx: AssetCtx | null, indent = ''): Promise<string> {
  const out: string[] = [];
  let numIdx = 0;
  for (const b of blocks) {
    const t = b.type;
    if (t !== 'numbered_list_item') numIdx = 0;
    const data = b[t];
    const kids = b.has_children ? await childrenOf(b.id) : [];
    const nestable = ['paragraph', 'bulleted_list_item', 'numbered_list_item', 'to_do', 'callout', 'toggle'].includes(t);
    const nested = kids.length && nestable ? '\n' + (await blocksToMd(kids, ctx, indent + '  ')) : '';

    switch (t) {
      case 'paragraph':
        out.push(indent + richText(data.rich_text) + nested); break;
      case 'heading_1': out.push(`# ${richText(data.rich_text)}`); break;
      case 'heading_2': out.push(`## ${richText(data.rich_text)}`); break;
      case 'heading_3': out.push(`### ${richText(data.rich_text)}`); break;
      case 'bulleted_list_item': out.push(`${indent}- ${richText(data.rich_text)}${nested}`); break;
      case 'numbered_list_item': out.push(`${indent}${++numIdx}. ${richText(data.rich_text)}${nested}`); break;
      case 'to_do': out.push(`${indent}- [${data.checked ? 'x' : ' '}] ${richText(data.rich_text)}${nested}`); break;
      case 'quote': out.push(`> ${richText(data.rich_text)}`); break;
      case 'callout': {
        const icon = data.icon?.emoji ? data.icon.emoji + ' ' : '';
        out.push(`> ${icon}${richText(data.rich_text)}${nested ? '\n' + nested : ''}`); break;
      }
      case 'code':
        out.push('```' + (data.language ?? '') + '\n' + richText(data.rich_text) + '\n```'); break;
      case 'divider': out.push('---'); break;
      case 'image': {
        const url = fileUrl(data); const cap = richText(data.caption);
        let rel: string | null = url;
        if (url && ctx) rel = await downloadImage(url, ctx, `body-${++ctx.count}`);
        out.push(rel ? `![${cap}](${rel})` : ''); break;
      }
      case 'video': case 'embed': case 'bookmark': case 'link_preview': {
        const url = data.url ?? fileUrl(data);
        // Preserve the URL as an autolink; a later pass can upgrade YouTube to an iframe component.
        out.push(url ? `[${url}](${url})` : ''); break;
      }
      case 'toggle':
        out.push(`<details><summary>${richText(data.rich_text)}</summary>\n\n${nested}\n</details>`); break;
      case 'table': {
        const rows = kids.filter((k) => k.type === 'table_row');
        if (!rows.length) break;
        const toRow = (r: any) => '| ' + r.table_row.cells.map((c: any) => richText(c).replace(/\|/g, '\\|').replace(/\n/g, ' ')).join(' | ') + ' |';
        const md = [toRow(rows[0])];
        md.push('| ' + Array(rows[0].table_row.cells.length).fill('---').join(' | ') + ' |');
        rows.slice(1).forEach((r) => md.push(toRow(r)));
        out.push(md.join('\n')); break;
      }
      case 'table_row': break; // handled by its parent table
      case 'child_page': break; // skip nested pages
      default:
        seenUnhandled.add(t);
        out.push(`<!-- TODO block: ${t} -->`);
    }
  }
  return out.filter((s) => s !== undefined).join('\n\n');
}

function yamlStr(s: string): string {
  return '"' + (s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
function yamlList(items: string[]): string {
  return '[' + items.map(yamlStr).join(', ') + ']';
}

function statusOf(page: any, kind: StatusKind): string {
  const p = page.properties?.['Status'];
  return (kind === 'select' ? p?.select?.name : p?.status?.name) ?? '';
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
  extra: (h: Helpers) => Promise<string[]>;
}

const CONTENT_SPECS: Record<string, ContentSpec> = {
  sessions: {
    dataSourceId: '33e9db0a-1418-4a3e-a053-33fa384e5e93',
    titleProp: 'Name', slugProp: 'slug', statusKind: 'select',
    liveStatuses: ['Done', 'Published'], featuredImageProp: 'Featured image', needsPeople: true,
    extra: async (h) => {
      const l: string[] = [];
      if (h.date('Datetime')) l.push(`datetime: ${h.date('Datetime')}`);
      const wp = h.date('Wordpress Published date'); if (wp) l.push(`wordpressPublishedDate: ${wp.slice(0, 10)}`);
      if (h.select('Type of session')) l.push(`typeOfSession: ${yamlStr(h.select('Type of session')!)}`);
      const level = h.multi('Level'); if (level.length) l.push(`level: ${yamlList(level)}`);
      const tags = h.multi('Tags'); if (tags.length) l.push(`tags: ${yamlList(tags)}`);
      for (const [k, p] of [['video', 'Video'], ['podcastPlayer', 'PodcastPlayer'], ['miro', 'Miro'], ['meet', 'Meet'], ['humantix', 'Humantix']] as const) {
        const u = h.url(p); if (u) l.push(`${k}: ${yamlStr(u)}`);
      }
      const org = h.person('Organiser')[0]; if (org) l.push(`organiser: ${yamlStr(org)}`);
      const co = h.person('Co-Organisers'); if (co.length) l.push(`coOrganisers: ${yamlList(co)}`);
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
      return l;
    },
  },
};

async function runContent(key: string, limit: number, outDir: string, write: boolean) {
  const spec = CONTENT_SPECS[key];
  if (!spec) { console.error(`unknown collection: ${key}`); process.exit(1); }

  console.log('building relation lookups...');
  const heurSlug = await buildLookup(HEURISTICS_DS, 'heuristics', (p) =>
    (p.properties?.Slug?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim());
  const personName = spec.needsPeople
    ? await buildLookup(PEOPLE_DS, 'people (organisers)', (p) => {
        const tp: any = Object.values(p.properties ?? {}).find((x: any) => x.type === 'title');
        return (tp?.title ?? []).map((t: any) => t.plain_text).join('').trim();
      })
    : new Map<string, string>();

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
      heur: (n) => rel(n).map((id: string) => heurSlug.get(id)).filter(Boolean) as string[],
      person: (n) => rel(n).map((id: string) => personName.get(id)).filter(Boolean) as string[],
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
    writeFileSync(`${outDir}/${slug}.md`, fm.join('\n') + '\n\n' + body + '\n');
    console.log(`  ✓ ${slug}.md (${body.length}c, ${ctx.count} imgs)`);
  }

  if (seenUnhandled.size) console.log(`\n  unhandled block types seen: ${[...seenUnhandled].join(', ')}`);
  if (!write) console.log(`\n  (preview only — files in ${outDir}, nothing under src/content/)`);
}

// --- organisers command: Notion -> JSON data collection ---------------------

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

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

// --- dispatch ---------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const write = args.includes('--write');
  const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

  if (cmd === 'slugs') return runSlugs(only, write);
  if (cmd === 'organisers') {
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? 'src/content/organisers' : 'migration-source/preview/organisers');
    return runOrganisers(outDir, write);
  }
  if (cmd === 'content') {
    const target = only ?? 'sessions';
    const outDir = args.find((a) => a.startsWith('--out='))?.split('=')[1]
      ?? (write ? `src/content/${target}` : `migration-source/preview/${target}`);
    return runContent(target, limit, outDir, write);
  }
  console.error('usage:\n  tsx scripts/sync-notion.ts slugs [--dry-run|--write] [--collection=sessions|open-spaces]\n  tsx scripts/sync-notion.ts content --collection=<sessions|open-spaces|stories|heuristics> [--limit=N] [--write]');
  process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
