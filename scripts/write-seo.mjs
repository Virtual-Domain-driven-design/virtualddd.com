/**
 * Write SEO titles and meta descriptions back into Notion.
 *
 * Notion stays the source of truth, so the copy has to live there — but writing
 * ~290 descriptions straight through an editor is unreviewable. So the copy is
 * authored in `data/seo-copy.csv`, which is committed and diffable, and this
 * script pushes it into Notion. Re-running is safe: it only writes a field when
 * the value actually differs.
 *
 * Usage:
 *   node scripts/write-seo.mjs                    # dry run, prints the diff
 *   node scripts/write-seo.mjs --write            # actually write
 *   node scripts/write-seo.mjs --collection=heuristics [--write]
 *
 * The CSV columns are: collection, slug, seoTitle, description
 * An empty cell means "leave whatever is in Notion alone"; to deliberately
 * clear a field, write the literal value CLEAR.
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

// Same pacing discipline as sync-notion.ts: Notion answers 429 above ~3 req/s.
const MIN_INTERVAL_MS = 340;
let nextSlot = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(label, fn, attempt = 0) {
  const wait = Math.max(0, nextSlot - Date.now());
  if (wait) await sleep(wait);
  nextSlot = Date.now() + MIN_INTERVAL_MS;
  try {
    return await fn();
  } catch (e) {
    const status = e?.status ?? e?.code;
    const retriable = status === 429 || status === 502 || status === 503 || status === 504;
    if (!retriable || attempt >= 4) throw e;
    const backoff = Number(e?.headers?.['retry-after'] ?? 0) * 1000 || 1000 * 2 ** attempt;
    console.warn(`  … ${label} got ${status}; retrying in ${Math.round(backoff / 1000)}s`);
    await sleep(backoff);
    return api(label, fn, attempt + 1);
  }
}

/** Where each collection keeps its slug, title override and description. */
const COLLECTIONS = {
  sessions: {
    dataSourceId: '33e9db0a-1418-4a3e-a053-33fa384e5e93',
    slugProp: 'slug', titleProp: 'SEO Title', descProp: 'SEO Metadescription',
  },
  'open-spaces': {
    dataSourceId: '0cfb73c7-a638-4948-a4df-5fe06dcd2dd1',
    slugProp: 'slug', titleProp: 'SEO Title', descProp: 'SEO Metadescription',
  },
  stories: {
    dataSourceId: '25aa485a-fafc-8047-94b7-000b3bbb228c',
    slugProp: 'slug', titleProp: 'SEO Title', descProp: 'SEO Metadescription',
  },
  heuristics: {
    dataSourceId: 'e7743290-3850-404e-ae98-23a4caf0488e',
    slugProp: 'Slug', titleProp: 'SEO Title', descProp: 'Meta Description',
  },
};

/** CSV reader that copes with quoted fields containing commas and quotes. */
function readCsv(path) {
  const text = readFileSync(path, 'utf8');
  const rows = [];
  let row = [], cur = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const plain = (prop) => (prop?.rich_text ?? []).map((t) => t.plain_text).join('').trim();

async function queryAll(dataSourceId) {
  const out = [];
  let cursor;
  do {
    const res = await api('query', () => notion.dataSources.query({
      data_source_id: dataSourceId, page_size: 100, start_cursor: cursor,
    }));
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

const args = process.argv.slice(2);
const write = args.includes('--write');
const only = args.find((a) => a.startsWith('--collection='))?.split('=')[1];

const copy = readCsv('data/seo-copy.csv');
let changed = 0, skipped = 0, missing = 0;

for (const [key, cfg] of Object.entries(COLLECTIONS)) {
  const rows = copy.filter((r) => r.collection === key);
  if (!rows.length || (only && only !== key)) continue;

  const pages = await queryAll(cfg.dataSourceId);
  const bySlug = new Map();
  for (const p of pages) bySlug.set(plain(p.properties?.[cfg.slugProp]), p);

  console.log(`\n=== ${key}: ${rows.length} rows of copy against ${pages.length} Notion pages`);

  for (const r of rows) {
    const page = bySlug.get(r.slug);
    if (!page) { console.log(`  ✗ no Notion page with slug "${r.slug}"`); missing++; continue; }

    const props = {};
    for (const [col, prop] of [['seoTitle', cfg.titleProp], ['description', cfg.descProp]]) {
      const wanted = r[col];
      if (!wanted) continue;                       // blank = leave alone
      const next = wanted === 'CLEAR' ? '' : wanted;
      if (plain(page.properties?.[prop]) === next) continue;
      props[prop] = { rich_text: next ? [{ type: 'text', text: { content: next } }] : [] };
    }

    if (!Object.keys(props).length) { skipped++; continue; }
    changed++;
    const fields = Object.keys(props).join(' + ');
    console.log(`  ${write ? '✓' : '·'} ${r.slug} (${fields})`);
    if (write) await api('update', () => notion.pages.update({ page_id: page.id, properties: props }));
  }
}

console.log(`\n${write ? 'written' : 'would write'}: ${changed} · already correct: ${skipped} · slug not found: ${missing}`);
if (!write) console.log('(dry run — pass --write to apply)');
if (missing) process.exitCode = 1;
