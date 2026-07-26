/**
 * Create the Session Guests rows in Notion and link them to their sessions.
 *
 * Reads `data/session-guests.csv`, which was extracted from session titles and
 * descriptions (see the commit that added it). From here on Notion is the place
 * to edit: the relation picker is far better than a CSV, and unlinking a wrong
 * guest is one click. This script exists to do the bulk creation once.
 *
 * Safe to re-run: it matches guests by name and sessions by slug, creates only
 * what is missing, and only writes a relation that differs from what is there.
 * It never removes a guest you added by hand — the relation it writes is the
 * union of what is in Notion and what is in the CSV.
 *
 * Usage:
 *   node scripts/write-guests.mjs            # dry run
 *   node scripts/write-guests.mjs --write
 */
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config({ path: 'local.env' });
const token = process.env.NOTION_TOKEN;
if (!token) { console.error('NOTION_TOKEN missing (expected in local.env).'); process.exit(1); }
const notion = new Client({ auth: token });

const SESSIONS = '33e9db0a-1418-4a3e-a053-33fa384e5e93';
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
  const [head, ...body] = rows.filter(r => r.some(c => c.trim()));
  return body.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const plain = (p) => (p?.rich_text ?? p?.title ?? []).map(t => t.plain_text).join('').trim();
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
const rows = readCsv('data/session-guests.csv').filter(r => r.guests);

const wanted = [...new Set(rows.flatMap(r => r.guests.split(';').map(s => s.trim()).filter(Boolean)))];
const guestPages = await queryAll(GUESTS);
const byName = new Map(guestPages.map(p => [plain(p.properties?.Name).toLowerCase(), p.id]));

console.log(`${wanted.length} guests in the CSV · ${guestPages.length} already in Notion\n`);

let created = 0;
for (const name of wanted) {
  if (byName.has(name.toLowerCase())) continue;
  created++;
  console.log(`  ${write ? '+' : '·'} create ${name}`);
  if (write) {
    const page = await api('create', () => notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: GUESTS },
      properties: {
        Name: { title: [{ type: 'text', text: { content: name } }] },
        Slug: { rich_text: [{ type: 'text', text: { content: slugify(name) } }] },
      },
    }));
    byName.set(name.toLowerCase(), page.id);
  }
}

const sessionPages = await queryAll(SESSIONS);
const bySlug = new Map(sessionPages.map(p => [plain(p.properties?.slug), p]));

let linked = 0, missing = 0;
for (const r of rows) {
  const page = bySlug.get(r.slug);
  if (!page) { console.log(`  ✗ no session with slug "${r.slug}"`); missing++; continue; }
  const names = r.guests.split(';').map(s => s.trim()).filter(Boolean);
  const ids = names.map(n => byName.get(n.toLowerCase())).filter(Boolean);
  if (!write && ids.length !== names.length) { /* rows not created yet in a dry run */ }

  // Union with whatever is already linked, so a guest added by hand survives.
  const existing = (page.properties?.Guests?.relation ?? []).map(x => x.id);
  const union = [...new Set([...existing, ...ids])];
  if (union.length === existing.length && existing.every(id => union.includes(id))) continue;

  linked++;
  console.log(`  ${write ? '✓' : '·'} ${r.slug} → ${names.join(', ')}`);
  if (write) await api('link', () => notion.pages.update({
    page_id: page.id, properties: { Guests: { relation: union.map(id => ({ id })) } },
  }));
}

console.log(`\n${write ? 'created' : 'would create'} ${created} guests · ${write ? 'linked' : 'would link'} ${linked} sessions${missing ? ` · ${missing} slugs not found` : ''}`);
if (!write) console.log('(dry run — pass --write to apply)');
