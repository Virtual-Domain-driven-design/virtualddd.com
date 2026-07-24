/**
 * One-time enrichment: bring the public team info that was hardcoded in
 * WordPress (dipl-team-member) into the "Virtual DDD Organisers" Notion DB.
 *
 * Reads migration-source/derived/team-members.json (from the WXR export),
 * matches to organiser rows by name, and fills Role / URL (website) /
 * LinkedIn / Twitter / Photo / Show on team.
 *
 *   tsx scripts/enrich-organisers.ts            # dry-run
 *   tsx scripts/enrich-organisers.ts --write    # apply
 */
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { Client } from '@notionhq/client';

dotenv.config({ path: 'local.env' });
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const ORGANISERS_DS = 'cbf1c508-e24f-4dd9-8c0d-b27b69bf64d6';

interface Member { name: string; role: string; website: string; linkedin: string; twitter: string; photo: string; }
const team: Member[] = JSON.parse(readFileSync('migration-source/derived/team-members.json', 'utf8'));

const tokens = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const subset = (a: string[], b: string[]) => a.every((t) => b.includes(t));

async function queryAll(ds: string) {
  const rows: any[] = []; let cursor: string | undefined;
  do {
    const res = await notion.dataSources.query({ data_source_id: ds, page_size: 100, start_cursor: cursor });
    rows.push(...res.results);
    cursor = res.has_more ? (res.next_cursor as string) : undefined;
  } while (cursor);
  return rows;
}
const titleOf = (p: any) => {
  const t: any = Object.values(p.properties ?? {}).find((x: any) => x.type === 'title');
  return (t?.title ?? []).map((r: any) => r.plain_text).join('').trim();
};

async function run() {
  const write = process.argv.includes('--write');
  const rows = await queryAll(ORGANISERS_DS);

  const unmatchedMembers: string[] = [];
  const plan: { page: any; member: Member }[] = [];
  for (const m of team) {
    const mt = tokens(m.name);
    const hits = rows.filter((r) => {
      const rt = tokens(titleOf(r));
      return rt.join(' ') === mt.join(' ') || subset(rt, mt) || subset(mt, rt);
    });
    if (hits.length === 1) plan.push({ page: hits[0], member: m });
    else unmatchedMembers.push(`${m.name} — ${hits.length} organiser matches`);
  }

  console.log(`team members: ${team.length} | matched: ${plan.length} | unmatched: ${unmatchedMembers.length}\n`);
  for (const { page, member } of plan) {
    console.log(`  ✓ "${member.name}" -> organiser "${titleOf(page)}"`);
    console.log(`      role=${member.role} | web=${member.website || '-'} | li=${member.linkedin ? 'y' : '-'} | tw=${member.twitter ? 'y' : '-'} | photo=${member.photo ? 'y' : '-'}`);
  }
  if (unmatchedMembers.length) { console.log('\n  UNMATCHED:'); unmatchedMembers.forEach((u) => console.log('   - ' + u)); }

  const shownOnTeam = rows.filter((r) => !plan.some((p) => p.page.id === r.id)).map(titleOf);
  console.log(`\n  organisers NOT on the public team (Show on team left off): ${shownOnTeam.join(', ')}`);

  if (!write) { console.log('\n  (dry-run — nothing written. Re-run with --write to apply.)'); return; }

  console.log('\n  --write: updating organiser rows...');
  for (const { page, member } of plan) {
    const props: any = {
      Role: { rich_text: member.role ? [{ text: { content: member.role } }] : [] },
      'Show on team': { checkbox: true },
    };
    if (member.website) props['URL'] = { url: member.website };
    if (member.linkedin) props['LinkedIn'] = { url: member.linkedin };
    if (member.twitter) props['Twitter'] = { url: member.twitter };
    if (member.photo) {
      const name = member.photo.split('/').pop() || 'photo';
      props['Photo'] = { files: [{ type: 'external', name, external: { url: member.photo } }] };
    }
    await notion.pages.update({ page_id: page.id, properties: props });
    console.log(`    wrote ${titleOf(page)}`);
  }
  console.log('  done.');
}
run().catch((e) => { console.error(e); process.exit(1); });
