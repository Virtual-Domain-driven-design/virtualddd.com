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
async function blocksToMd(blocks: any[], indent = ''): Promise<string> {
  const out: string[] = [];
  let numIdx = 0;
  for (const b of blocks) {
    const t = b.type;
    if (t !== 'numbered_list_item') numIdx = 0;
    const data = b[t];
    const kids = b.has_children ? await childrenOf(b.id) : [];
    const nested = kids.length ? '\n' + (await blocksToMd(kids, indent + '  ')) : '';

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
        out.push(`![${cap}](${url})`); break; // real sync downloads these locally
      }
      case 'video': case 'embed': case 'bookmark': case 'link_preview': {
        const url = data.url ?? fileUrl(data);
        out.push(url ? `{% embed ${url} %}` : ''); break; // embed marker — preserved, rendered later
      }
      case 'toggle':
        out.push(`<details><summary>${richText(data.rich_text)}</summary>\n\n${nested}\n</details>`); break;
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

async function runContentSessions(limit: number, outDir: string, write: boolean) {
  console.log('building relation lookups (heuristics, people)...');
  const heurSlug = await buildLookup(HEURISTICS_DS, 'heuristics', (p) =>
    (p.properties?.Slug?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim());
  const personName = await buildLookup(PEOPLE_DS, 'people (organisers)', (p) => {
    const titleProp: any = Object.values(p.properties ?? {}).find((x: any) => x.type === 'title');
    return (titleProp?.title ?? []).map((t: any) => t.plain_text).join('').trim();
  });

  const cfg = COLLECTIONS.sessions;
  const pages = (await queryAll(cfg.dataSourceId))
    .filter((p) => cfg.liveStatuses.includes(statusName(p, cfg)));
  const targets = limit ? pages.slice(0, limit) : pages;
  mkdirSync(outDir, { recursive: true });
  console.log(`sessions to render: ${targets.length}${limit ? ` (limited from ${pages.length})` : ''} -> ${outDir}\n`);

  for (const page of targets) {
    const P = page.properties;
    const get = (n: string) => P[n];
    const slug = (get('slug')?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const title = plainTitle(page, 'Name');
    if (!slug) { console.log(`  ! no slug, skipping "${title}"`); continue; }

    const rel = (n: string) => (get(n)?.relation ?? []).map((r: any) => r.id.replace(/-/g, ''));
    const heur = rel('Curated Heuristics').map((id: string) => heurSlug.get(id)).filter(Boolean);
    const organiser = rel('Organiser').map((id: string) => personName.get(id)).filter(Boolean)[0];
    const coOrg = rel('Co-Organisers').map((id: string) => personName.get(id)).filter(Boolean);

    const fm: string[] = ['---'];
    fm.push(`title: ${yamlStr(title)}`);
    fm.push(`slug: ${yamlStr(slug)}`);
    fm.push(`status: ${yamlStr(statusName(page, cfg))}`);
    if (get('Datetime')?.date?.start) fm.push(`datetime: ${get('Datetime').date.start}`);
    if (get('Wordpress Published date')?.date?.start) fm.push(`wordpressPublishedDate: ${get('Wordpress Published date').date.start.slice(0, 10)}`);
    if (get('Type of session')?.select?.name) fm.push(`typeOfSession: ${yamlStr(get('Type of session').select.name)}`);
    const level = (get('Level')?.multi_select ?? []).map((o: any) => o.name);
    if (level.length) fm.push(`level: ${yamlList(level)}`);
    const tags = (get('Tags')?.multi_select ?? []).map((o: any) => o.name);
    if (tags.length) fm.push(`tags: ${yamlList(tags)}`);
    for (const [k, prop] of [['video', 'Video'], ['podcastPlayer', 'PodcastPlayer'], ['miro', 'Miro'], ['meet', 'Meet'], ['humantix', 'Humantix']] as const) {
      if (get(prop)?.url) fm.push(`${k}: ${yamlStr(get(prop).url)}`);
    }
    if (organiser) fm.push(`organiser: ${yamlStr(organiser)}`);
    if (coOrg.length) fm.push(`coOrganisers: ${yamlList(coOrg)}`);
    if (heur.length) fm.push(`curatedHeuristics: ${yamlList(heur as string[])}`);
    const seoT = (get('SEO Title')?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    const seoD = (get('SEO Metadescription')?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
    if (seoT) fm.push(`seoTitle: ${yamlStr(seoT)}`);
    if (seoD) fm.push(`seoMetadescription: ${yamlStr(seoD)}`);
    const featured = fileUrl((get('Featured image')?.files ?? [])[0]);
    if (featured) fm.push(`featuredImageRemote: ${yamlStr(featured)}  # real sync downloads to src/assets`);
    fm.push('---');

    const body = await blocksToMd(await childrenOf(page.id));
    writeFileSync(`${outDir}/${slug}.md`, fm.join('\n') + '\n\n' + body + '\n');
    console.log(`  ✓ ${slug}.md  (${body.length} chars body, ${heur.length} heuristics, ${coOrg.length} co-org)`);
  }

  if (seenUnhandled.size) console.log(`\n  unhandled block types seen: ${[...seenUnhandled].join(', ')}`);
  if (!write) console.log(`\n  (preview only — files in ${outDir}, nothing under src/content/)`);
}

// --- dispatch ---------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const write = args.includes('--write');
  const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);
  const out = args.find((a) => a.startsWith('--out='))?.split('=')[1]
    ?? 'migration-source/preview/sessions';

  if (cmd === 'slugs') return runSlugs(only, write);
  if (cmd === 'content') {
    const target = only ?? 'sessions';
    if (target !== 'sessions') { console.error('content sync: only "sessions" implemented so far'); process.exit(1); }
    return runContentSessions(limit, out, write);
  }
  console.error('usage:\n  tsx scripts/sync-notion.ts slugs [--dry-run|--write] [--collection=sessions|open-spaces]\n  tsx scripts/sync-notion.ts content --collection=sessions [--limit=N] [--out=DIR]');
  process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
