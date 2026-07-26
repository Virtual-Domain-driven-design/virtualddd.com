/**
 * Verify a *deployed* host: the check the local suite cannot do.
 *
 * `check-redirects.mjs` simulates mod_rewrite. Only a real request against real
 * Apache/LiteSpeed proves that the .htaccess is honoured, that 410 really means
 * 410, and that no redirect takes two hops. Run it against staging before a
 * release and against production after.
 *
 *   node scripts/verify-live.mjs https://staging.virtualddd.com
 *   node scripts/verify-live.mjs https://virtualddd.com --all
 *
 * Without --all it samples each URL family, which is enough to prove the rules
 * are live and takes about a minute instead of twenty.
 */
import { readFileSync } from 'node:fs';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
const all = process.argv.includes('--all');
if (!base.startsWith('http')) {
  console.error('usage: node scripts/verify-live.mjs <base-url> [--all]');
  process.exit(1);
}

const urls = readFileSync('data/live-urls.txt', 'utf8').trim().split('\n');

/** Group by URL family so a sample covers every rule, not the first 50 URLs. */
const familyOf = (u) => {
  const seg = u.split('/').filter(Boolean)[0] ?? 'root';
  return /^(sessions|videos|heuristics|facilitating-archdes|open-space|ddd-crew)$/.test(seg) &&
    u.split('/').filter(Boolean).length > 1
    ? `${seg}/item`
    : seg;
};

const families = new Map();
for (const u of urls) {
  const f = familyOf(u);
  if (!families.has(f)) families.set(f, []);
  families.get(f).push(u);
}

const targets = all
  ? urls
  : [...families.values()].flatMap((list) => list.slice(0, 5));

console.log(`checking ${targets.length} URL(s) against ${base}\n`);

const CONCURRENCY = 6;
const results = [];
let index = 0;

async function worker() {
  while (index < targets.length) {
    const path = targets[index++];
    try {
      // manual redirect: we want to see each hop, not the final page.
      const res = await fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      const location = res.headers.get('location');
      let hops = 0;
      let status = res.status;
      let target = location;
      // Follow up to three hops so chains are visible.
      while (target && hops < 3) {
        hops++;
        const next = await fetch(new URL(target, base).toString(), {
          redirect: 'manual',
          signal: AbortSignal.timeout(20000),
        });
        status = next.status;
        target = next.headers.get('location');
        if (!target) break;
      }
      results.push({ path, first: res.status, hops, final: status, location });
    } catch (e) {
      results.push({ path, error: e.message });
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const bad = [];
for (const r of results) {
  if (r.error) { bad.push(`${r.path} — request failed: ${r.error}`); continue; }
  if (r.first === 404) { bad.push(`${r.path} — 404 (nothing handles it)`); continue; }
  if (r.first === 200 || r.first === 410) continue;
  if (r.first === 301 || r.first === 308) {
    if (r.final === 404) bad.push(`${r.path} — 301 → ${r.location} → 404`);
    else if (r.hops > 1) bad.push(`${r.path} — ${r.hops} redirect hops (chain) → ${r.location}`);
    continue;
  }
  if (r.first === 302 || r.first === 307) {
    bad.push(`${r.path} — temporary redirect (${r.first}); these should be permanent`);
    continue;
  }
  bad.push(`${r.path} — unexpected status ${r.first}`);
}

const count = (p) => results.filter(p).length;
console.log(`  200 OK        : ${count((r) => r.first === 200)}`);
console.log(`  301 redirect  : ${count((r) => r.first === 301 || r.first === 308)}`);
console.log(`  410 Gone      : ${count((r) => r.first === 410)}`);
console.log(`  problems      : ${bad.length}`);

if (bad.length) {
  console.error('\nproblems:');
  for (const b of bad.slice(0, 50)) console.error(`  ${b}`);
  if (bad.length > 50) console.error(`  … and ${bad.length - 50} more`);
  process.exit(1);
}
console.log('\nthe deployed redirect map behaves as designed.');
