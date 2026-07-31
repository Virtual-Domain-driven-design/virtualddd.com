/**
 * Backfill the Notion Videos database from data/videos-inventory.csv.
 *
 *   tsx scripts/import-videos.ts            # dry run, prints what it would create
 *   tsx scripts/import-videos.ts --write    # actually creates the rows
 *
 * Every row lands with Status = Idea. Nothing reaches the website until a human
 * promotes it to Published, which is the same gate every other collection uses
 * and the only reason it is safe to put 536 rows in here at all: this is an
 * inventory to curate FROM, not a catalogue to publish.
 *
 * Idempotent by Slug. Re-running adds only what is missing, so a failed half-run
 * is repaired by running it again rather than by cleaning up 300 duplicates.
 *
 * Deliberately left empty for a human:
 *   Speaker              — these titles cannot be parsed into names reliably,
 *                          and a wrong attribution is worse than a blank field.
 *   Why it is worth it   — that IS the curation. A machine cannot write it.
 */
import { readFileSync, readdirSync } from 'node:fs';

const DS = 'f929a0ef-2224-4ae1-8057-4a03805c59e7'; // 🎬 Videos
const SESSIONS_DS = '33e9db0a-1418-4a3e-a053-33fa384e5e93';
const write = process.argv.includes('--write');

const token = process.env.NOTION_TOKEN;
if (write && !token) {
  console.error('NOTION_TOKEN missing (expected in local.env).');
  process.exit(1);
}

/** The CSV is hand-exported and contains quoted fields with commas in titles. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/**
 * The conferences that actually appear in these titles. Matching a known name is
 * the only safe way to fill Source: a generic "everything after the last dash"
 * rule turns speaker names into conferences.
 */
const CONFERENCES = [
  'DDD Europe', 'KanDDDinsky', 'DDD Taiwan', 'DDD London', 'Explore DDD',
  'DDD Africa', 'Virtual DDD', 'NDC', 'GOTO',
];

function sourceOf(title: string): string {
  const hit = CONFERENCES.find((c) => title.toLowerCase().includes(c.toLowerCase()));
  return hit ?? '';
}

/**
 * The year comes from the TITLE, never from the CSV `date` column. That column
 * is the old WordPress post date: "Introduction to Context Mapping ... DDD
 * Europe 2022" is dated 2018 in the CSV, and the Starter Modelling talk labelled
 * 2022 is dated 2017. Trusting the column would put a wrong year on hundreds of
 * rows.
 */
function yearOf(title: string): number | null {
  const years = [...title.matchAll(/\b(19[89]\d|20[0-4]\d)\b/g)].map((m) => Number(m[1]));
  return years.length ? Math.max(...years) : null;
}

async function notion(path: string, body: unknown) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      // The n8n credential pins 2022-06-28, but this script talks to Notion
      // directly, so it uses the version the data-source endpoints need.
      'Notion-Version': '2025-09-03',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function queryAll(dataSource: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const page: any = await notion(`data_sources/${dataSource}/query`, {
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    out.push(...page.results);
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return out;
}

const plain = (rt: any[] = []) => rt.map((t) => t.plain_text ?? '').join('').trim();

async function main() {
  const videos = parseCsv(readFileSync('data/videos-inventory.csv', 'utf8'));

  // A video whose slug is also a session slug is the recording of one of our own
  // sessions. Those get Ours ticked and a relation, so the 95 that already 301
  // to a session page stay connected to it.
  const sessionSlugs = new Set(
    readdirSync('src/content/sessions').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
  );

  const rows = videos
    .filter((v) => v.slug)
    .map((v) => ({
      slug: v.slug,
      title: v.title || v.slug,
      youtubeId: v.youtube_id || '',
      link: v.youtube_id ? '' : v.other_url || '',
      source: sourceOf(v.title || ''),
      year: yearOf(v.title || ''),
      ours: sessionSlugs.has(v.slug),
    }));

  const withId = rows.filter((r) => r.youtubeId).length;
  console.log(`${rows.length} rows in the inventory`);
  console.log(`  ${withId} with a YouTube id, ${rows.length - withId} without`);
  console.log(`  ${rows.filter((r) => r.ours).length} are our own session recordings`);
  console.log(`  ${rows.filter((r) => r.source).length} have a recognisable conference in the title`);
  console.log(`  ${rows.filter((r) => r.year !== null).length} have a year in the title`);

  if (!write) {
    console.log('\nFirst five, as they would be created (Status = Idea):');
    for (const r of rows.slice(0, 5)) console.log(' ', JSON.stringify(r));
    console.log('\nDry run. Nothing was written. Re-run with --write to create them.');
    return;
  }

  // Idempotent by Slug: read what is already there before writing anything.
  const existing = new Set(
    (await queryAll(DS)).map((p: any) => plain(p.properties?.Slug?.rich_text)).filter(Boolean)
  );
  const sessionBySlug = new Map<string, string>();
  for (const p of await queryAll(SESSIONS_DS)) {
    const s = plain(p.properties?.slug?.rich_text);
    if (s) sessionBySlug.set(s, p.id);
  }

  const todo = rows.filter((r) => !existing.has(r.slug));
  console.log(`\n${existing.size} already in Notion, creating ${todo.length}`);

  let done = 0;
  for (const r of todo) {
    const props: Record<string, unknown> = {
      Title: { title: [{ type: 'text', text: { content: r.title.slice(0, 2000) } }] },
      Slug: { rich_text: [{ type: 'text', text: { content: r.slug } }] },
      Status: { select: { name: 'Idea' } },
      Ours: { checkbox: r.ours },
    };
    if (r.youtubeId) props['YouTube ID'] = { rich_text: [{ type: 'text', text: { content: r.youtubeId } }] };
    if (r.link) props.Link = { url: r.link };
    if (r.source) props.Source = { rich_text: [{ type: 'text', text: { content: r.source } }] };
    if (r.year !== null) props.Year = { number: r.year };
    const sessionId = sessionBySlug.get(r.slug);
    if (sessionId) props.Session = { relation: [{ id: sessionId }] };

    await notion('pages', { parent: { type: 'data_source_id', data_source_id: DS }, properties: props });
    done += 1;
    if (done % 25 === 0) console.log(`  ${done}/${todo.length}`);
    // Notion allows roughly three requests a second and answers 429 above it.
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(`Created ${done}. Everything is Status = Idea; promote what is worth publishing.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
