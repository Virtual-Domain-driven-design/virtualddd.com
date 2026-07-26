/**
 * Fill in the Session Guests profile fields in Notion, from what the sessions
 * already said about their speakers.
 *
 * The 54 guest rows were created from session titles and so hold a name and a
 * slug each. Many session descriptions introduce their speaker — an "About the
 * speaker" block, a byline, a parenthesised job title — and that copy belongs
 * on the person, where it becomes `Person.jobTitle`, `description` and
 * `sameAs`. `data/guest-profiles.csv` is that extraction, read and written by
 * hand so a sentence about a real person is never assembled by a regex.
 *
 * **It only ever fills an empty field.** Anything already typed in Notion wins,
 * because Notion is the source of truth and someone editing their own bio must
 * not be overwritten by a re-run. Pass --force to overwrite deliberately.
 *
 * The `source` and `removable` columns are for the humans: which session the
 * copy came from, and whether that paragraph is a standalone block that could
 * later be deleted from the session page. Nothing here removes anything.
 *
 * Usage:
 *   node scripts/write-guest-profiles.mjs            # dry run
 *   node scripts/write-guest-profiles.mjs --write
 */
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config({ path: 'local.env' });
const token = process.env.NOTION_TOKEN;
if (!token) { console.error('NOTION_TOKEN missing (expected in local.env).'); process.exit(1); }
const notion = new Client({ auth: token });

const GUESTS = 'd82910e0-cac0-46f8-8a20-cb3a3376d5eb';

const MIN_INTERVAL_MS = 340;
let nextSlot = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(label, fn, attempt = 0) {
  const wait = Math.max(0, nextSlot - Date.now());
  if (wait) await sleep(wait);
  nextSlot = Date.now() + MIN_INTERVAL_MS;
  try { return await fn(); } catch (e) {
    const status = e?.status ?? e?.code;
    if (![429, 502, 503, 504].includes(status) || attempt >= 4) throw e;
    const backoff = Number(e?.headers?.['retry-after'] ?? 0) * 1000 || 1000 * 2 ** attempt;
    console.warn(`  … ${label} got ${status}; retrying in ${Math.round(backoff / 1000)}s`);
    await sleep(backoff);
    return api(label, fn, attempt + 1);
  }
}

function readCsv(path) {
  const text = readFileSync(path, 'utf8');
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const plain = (p) => (p?.rich_text ?? p?.title ?? []).map((t) => t.plain_text).join('').trim();

async function queryAll(ds) {
  const out = []; let cursor;
  do {
    const res = await api('query', () => notion.dataSources.query({ data_source_id: ds, page_size: 100, start_cursor: cursor }));
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

const write = process.argv.includes('--write');
const force = process.argv.includes('--force');
const rows = readCsv('data/guest-profiles.csv');

const pages = await queryAll(GUESTS);
const bySlug = new Map(pages.map((p) => [plain(p.properties?.Slug), p]));
const byName = new Map(pages.map((p) => [plain(p.properties?.Name).toLowerCase(), p]));

console.log(`${rows.length} rows of copy against ${pages.length} guests in Notion\n`);

/** Text fields, then URL fields — the URLs become `sameAs`. */
const TEXT = [['role', 'Role'], ['bio', 'Bio']];
const URLS = [['website', 'Website'], ['linkedin', 'LinkedIn'], ['mastodon', 'Mastodon'], ['bluesky', 'Bluesky']];

let changed = 0, kept = 0, missing = 0;
for (const r of rows) {
  const page = bySlug.get(r.slug) ?? byName.get(r.name.toLowerCase());
  if (!page) { console.log(`  ✗ no guest with slug "${r.slug}"`); missing++; continue; }

  const props = {};
  const held = [];
  for (const [col, prop] of TEXT) {
    if (!r[col]) continue;
    const current = plain(page.properties?.[prop]);
    if (current && !force) { held.push(prop); continue; }
    if (current === r[col]) continue;
    props[prop] = { rich_text: [{ type: 'text', text: { content: r[col] } }] };
  }
  for (const [col, prop] of URLS) {
    if (!r[col]) continue;
    const current = page.properties?.[prop]?.url ?? '';
    if (current && !force) { held.push(prop); continue; }
    if (current === r[col]) continue;
    props[prop] = { url: r[col] };
  }

  if (held.length) console.log(`  · ${r.slug}: keeping what Notion already has for ${held.join(', ')}`);
  if (!Object.keys(props).length) { kept++; continue; }
  changed++;
  console.log(`  ${write ? '✓' : '·'} ${r.slug} → ${Object.keys(props).join(', ')}`);
  if (write) await api('update', () => notion.pages.update({ page_id: page.id, properties: props }));
}

console.log(`\n${write ? 'written' : 'would write'}: ${changed} · nothing to do: ${kept}${missing ? ` · not found: ${missing}` : ''}`);
if (!write) console.log('(dry run — pass --write to apply)');
if (missing) process.exitCode = 1;
