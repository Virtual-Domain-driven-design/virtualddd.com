/**
 * Fill in what the Guests database is missing, from the Organisers database.
 *
 *   npx tsx scripts/backfill-guests.ts           # show what it would write
 *   npx tsx scripts/backfill-guests.ts --write   # write it
 *
 * Seven of our guests also organise, and their organiser row already carries
 * the links their guest row does not. The site already rejoins the two by name
 * (`samePerson`), so this changes nothing you can see: it is for **n8n**, which
 * reads Notion directly and has no way to do that join. A social flow that
 * wants a speaker's Bluesky handle can only find it on the guest row.
 *
 * It only ever fills a field that is **empty**. Nothing typed by hand is
 * replaced, so this is safe to re-run.
 *
 * What it deliberately does NOT do is guess. There is no lookup here from a
 * name to a stranger's profile: the ~107 guests with no organiser row are left
 * alone, because a LinkedIn attached to the wrong "Chris Simon" is a false
 * claim about a real person, and these values become `sameAs` in our structured
 * data. See docs/content-model.md.
 *
 * Photos are left alone too. A Notion-hosted file has a signed URL that expires
 * within the hour, so it cannot simply be copied to another row, and the site
 * already borrows the organiser's portrait for a matching guest.
 */
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';
import { samePerson } from '../src/lib/people';

dotenv.config({ path: 'local.env' });

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN missing (expected in local.env).');
  process.exit(1);
}
const notion = new Client({ auth: token });
const write = process.argv.includes('--write');

const PEOPLE_DS = 'cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6';
const GUESTS_DS = 'd82910e0-cac0-46f8-8a20-cb3a3376d5eb';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function allRows(dataSourceId: string) {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await (notion as any).request({
      path: `data_sources/${dataSourceId}/query`,
      method: 'post',
      body: { start_cursor: cursor, page_size: 100 },
    });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
    await sleep(340); // Notion allows roughly three requests a second.
  } while (cursor);
  return out;
}

const title = (p: any) => (p?.title ?? []).map((t: any) => t.plain_text).join('').trim();
const text = (p: any) => (p?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
const url = (p: any) => (p?.url ?? '').trim();

/** A profile URL as the handle both people databases now want.
 *
 * The mirror of `socialUrl` in src/lib/people.ts. Since 2026-08-01 organisers
 * hold handles too, so this mostly passes its input straight through. It is
 * kept because a row entered before that, or pasted from a browser, is still a
 * URL, and copying one of those into a guest row would put a link where the
 * social flows expect something they can @-mention.
 */
function toHandle(network: 'mastodon' | 'bluesky', value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (v.startsWith('@')) return v; // already a handle
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return undefined;
  }
  if (network === 'bluesky') {
    const m = u.pathname.match(/^\/profile\/([^/]+)/);
    return m ? `@${m[1]}` : undefined;
  }
  const m = u.pathname.match(/^\/@([^/]+)/);
  return m ? `@${m[1]}@${u.hostname}` : undefined;
}

const [organisers, guests] = await Promise.all([allRows(PEOPLE_DS), allRows(GUESTS_DS)]);

const people = organisers.map((r: any) => ({
  name: title(r.properties.Name),
  website: url(r.properties.URL),
  linkedin: url(r.properties.LinkedIn),
  mastodon: toHandle('mastodon', url(r.properties.Mastodon) || text(r.properties.Mastodon)),
  bluesky: toHandle('bluesky', url(r.properties.Bluesky) || text(r.properties.Bluesky)),
}));

let changed = 0;
const untouched: string[] = [];

for (const g of guests) {
  const name = title(g.properties.Name);
  const match = people.find((p) => p.name && samePerson(p.name, name));
  if (!match) {
    untouched.push(name);
    continue;
  }

  // Only ever fill what is empty.
  const props: Record<string, any> = {};
  const fills: string[] = [];

  const setUrl = (key: string, existing: string, value: string) => {
    if (existing || !value) return;
    props[key] = { url: value };
    fills.push(`${key}=${value}`);
  };
  const setText = (key: string, existing: string, value?: string) => {
    if (existing || !value) return;
    props[key] = { rich_text: [{ type: 'text', text: { content: value } }] };
    fills.push(`${key}=${value}`);
  };

  setUrl('Website', url(g.properties.Website), match.website);
  setUrl('LinkedIn', url(g.properties.LinkedIn), match.linkedin);
  setText('Mastodon', text(g.properties.Mastodon), match.mastodon);
  setText('Bluesky', text(g.properties.Bluesky), match.bluesky);

  if (!fills.length) continue;
  changed++;
  console.log(`  ${write ? '✓' : '·'} ${name}  ←  ${match.name}`);
  for (const f of fills) console.log(`      ${f}`);

  if (write) {
    await notion.pages.update({ page_id: g.id, properties: props as any });
    await sleep(340);
  }
}

console.log('');
console.log(`  ${changed} guest row${changed === 1 ? '' : 's'} ${write ? 'updated' : 'would be updated'}.`);
console.log(`  ${untouched.length} guests have no organiser row, so nothing here can fill them in.`);
if (!write) console.log('  (dry run — add --write to apply)');
