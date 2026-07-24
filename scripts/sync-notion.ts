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

// --- main -------------------------------------------------------------------

async function run() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const write = args.includes('--write');
  const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];

  if (cmd !== 'slugs') {
    console.error('usage: tsx scripts/sync-notion.ts slugs [--dry-run|--write] [--collection=sessions|open-spaces]');
    process.exit(1);
  }

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

run().catch((e) => { console.error(e); process.exit(1); });
