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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
/**
 * Said out loud, never fatal.
 *
 * Only the apex redirect lives here, and only because it is the one check that
 * races the host. After a release the www vhost serves 200 for a few minutes
 * before it honours the new .htaccess, and the window is not predictable: the
 * budget went from forty seconds to five tries to twelve tries over three
 * minutes and it still lost on 2026-07-30, then redirected correctly thirty
 * seconds later. Four good deploys have been failed by it and it has never
 * caught a real fault.
 *
 * The cost of that is not a red cross. `Tell n8n what shipped` is skipped when
 * this step fails, so a good deploy ships in silence. Meanwhile watch.yml runs
 * this same script weekly against a settled site, which is where a genuine www
 * regression gets caught, and a week is the right urgency for one.
 *
 * Everything else here stays fatal: a 404 on an inherited URL, a redirect
 * chain, a search index the host will not serve.
 */
const warn = [];
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

// One hostname. Only meaningful for the bare domain — a staging subdomain has
// no www of its own — so anything with a subdomain skips this silently.
const host = new URL(base).host;
let wwwNote = '';
if (host.split('.').length === 2) {
  const wwwUrl = `https://www.${host}/`;
  // Retried, because this runs seconds after the release symlink was swapped
  // and Apache does not always have the new `.htaccess` in hand yet. In that
  // window every address answers 200 from the document root — the sweep above
  // cannot see it, since a page that is *served* is a pass there, but this is
  // the one check that demands a redirect, so it is the only one that fails.
  //
  // It has done so twice, on deploys that were entirely fine, and the cost is
  // not a red cross: `Tell n8n what shipped` is skipped when this step fails,
  // so a good deploy ships silently. A check that cries wolf is worse than no
  // check, because people learn to scroll past it.
  // A short look, not a vigil. Three minutes of patience was bought when this
  // could fail the deploy; now that it only warns, spending them would be
  // three minutes added to every release for a line of output. Four tries over
  // half a minute catches the case where the host has already settled and says
  // so plainly when it has not.
  const attempts = 4;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) await sleep(10000);
    try {
      const res = await fetch(wwwUrl, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
      const to = res.headers.get('location');
      if (res.status === 301 && to && new URL(to, wwwUrl).host === host) {
        wwwNote = `  www → apex  : 301 ${to}`;
        break;
      }
      if (attempt < attempts) {
        console.log(`  www answered ${res.status}; the release may still be settling, retrying…`);
        continue;
      }
      if (res.status !== 301) warn.push(`${wwwUrl} — ${res.status} after ${attempts} tries, expected a 301 to https://${host}/`);
      else warn.push(`${wwwUrl} — 301 to ${to}, which is not ${host}`);
    } catch (e) {
      if (attempt < attempts) { console.log(`  www request failed (${e.message}), retrying…`); continue; }
      warn.push(`${wwwUrl} — request failed: ${e.message}`);
    }
  }
}

// Site search, which nothing else can prove is live. `check:urls` works from
// `dist`, where the index plainly exists; the question is whether the *host*
// hands it over. Pagefind's payload is not `.js` and `.json` but `.pagefind`,
// `.pf_meta` and `.pf_fragment`, and a host that will not serve an extension it
// does not recognise breaks search while every page still renders perfectly.
// Not in data/live-urls.txt on purpose: that file is the promise inherited from
// the old site, not a list of everything the deploy contains.
const SEARCH_ASSETS = ['/search/', '/pagefind/pagefind.js', '/pagefind/pagefind-entry.json'];
for (const path of SEARCH_ASSETS) {
  try {
    const res = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) bad.push(`${path} — ${res.status}; site search will not work`);
  } catch (e) {
    bad.push(`${path} — request failed: ${e.message}; site search will not work`);
  }
}

const count = (p) => results.filter(p).length;
console.log(`  200 OK        : ${count((r) => r.first === 200)}`);
console.log(`  301 redirect  : ${count((r) => r.first === 301 || r.first === 308)}`);
console.log(`  410 Gone      : ${count((r) => r.first === 410)}`);
if (wwwNote) console.log(wwwNote);
console.log(`  problems      : ${bad.length}`);

if (warn.length) {
  console.log(`  warnings      : ${warn.length}`);
  for (const w of warn) console.log(`    ${w}`);
  console.log('  (not fatal: the apex redirect settles minutes after a release,');
  console.log('   and watch.yml checks it weekly against a site that has.)');
}

if (bad.length) {
  console.error('\nproblems:');
  for (const b of bad.slice(0, 50)) console.error(`  ${b}`);
  if (bad.length > 50) console.error(`  … and ${bad.length - 50} more`);
  process.exit(1);
}
console.log('\nthe deployed redirect map behaves as designed.');
