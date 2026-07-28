/**
 * Generate `public/.htaccess` — the site's redirect and gone map.
 *
 * Every rule traces back to the URL inventory in data/: 967 public addresses,
 * of which 674 have no page in this build. Each of those got a deliberate
 * decision — redirected once, or 410 Gone — rather than being left to 404.
 * See AGENTS.md, "The URL contract".
 *
 * The inputs are committed, so this is reproducible from the repo alone:
 *   data/videos-inventory.csv   536 video URLs + their YouTube IDs
 *   data/legacy-redirects.csv   35 rules inherited from the old redirect table
 *   src/content/sessions/*.md   session slugs, to match video recordings
 *
 * Run: node scripts/build-redirects.mjs   (writes public/.htaccess)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const readCsv = (path) => {
  const [head, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = head.split(',');
  return lines.map((line) => {
    // Fields may contain commas inside quotes; titles are the only such field.
    const out = [];
    let cur = '', quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, out[i] ?? '']));
  });
};

const sessionSlugs = new Set(
  readdirSync('src/content/sessions').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')),
);
const videos = readCsv('data/videos-inventory.csv');
const legacy = readCsv('data/legacy-redirects.csv');

// A video whose slug is also a session slug is the recording of that session:
// the session page carries the same video plus the write-up, so it is a true
// equivalent. Everything else under /videos/ is imported third-party
// conference metadata (KanDDDinsky, DDD Taiwan) and is Gone.
const recordings = videos.filter((v) => sessionSlugs.has(v.slug));
const foreign = videos.length - recordings.length;

// The eight retired team pages map onto the organisers collection.
const TEAM = {
  'andrea-magnorsky': 'andrea-magnorsky',
  'andrew-harmel-law': 'andrew-harmel-law',
  'diana-montalion': 'diana-montalion',
  'kenny-baas-schwegler': 'kenny-baas-schwegler',
  'krisztina-hirth': 'krisztina-hirth',
  'marco-heimeshoff': 'marco-heimeshoff',
  'maxime-sanglan-charlier': 'maxime',
  'zsofia-herendi': 'zsofia-herendi',
};

// Nav landing pages that were separate pages once. This site
// serves the curated experience at the archive path, so these collapse.
const LANDING = {
  '/meetup-sessions/': '/sessions/',
  '/stories-on-facilitating-software-architecture-design/': '/facilitating-archdes/',
  '/ddd-open-space/': '/open-space/',
  '/design-heuristics/': '/heuristics/design-heuristics/',
  '/guiding-heuristics/': '/heuristics/guiding-heuristics/',
  '/value-based-heuristics/': '/heuristics/value-based-heuristics/',
  '/github-repositories/': '/ddd-crew/',
  '/git_pages/': '/ddd-crew/',
  '/git_pages/eventstorming-glossary-cheat-sheet/': '/ddd-crew/eventstorming-glossary-cheat-sheet/',
  '/videos/': '/sessions/',
  '/learning-videos/': '/sessions/',
  '/submit-heuristic/': '/ddd-heuristics/',
};

// The ddd-crew reposts lived under /github-repositories/ with the old site's
// slugs; the rebuild uses the upstream repository names.
const GITHUB_REPOS = {
  'core-domain-charts': 'core-domain-charts',
  'domain-driven-design-starter-modelling-process': 'ddd-starter-modelling-process',
  'eventstorming-glossary-cheat-sheet': 'eventstorming-glossary-cheat-sheet',
  'the-aggregate-design-canvas': 'aggregate-design-canvas',
  'the-bounded-context-canvas': 'bounded-context-canvas',
  'welcome-to-domain-driven-design-ddd': 'welcome-to-ddd',
};

// Pages that were never real: a demo, a test page that published the live
// Google Meet room, and a Lorem-ipsum form page.
const GONE_PAGES = ['/demo-sessions/', '/test-page-niet-weggooien/', '/submit-community/'];

// Editorial changes in Notion that retire a URL: a merged duplicate, or a
// renamed slug. Notion is the source of truth, so the page simply stops
// existing on the next sync — this is where its old URL keeps working. Add a
// line here whenever `npm run check:urls` reports a slug with no page.
const RETIRED = {
  // Two rows carried the same title; merged in Notion 2026-07-26.
  '/heuristics/eventstorming-split-and-merge-above-7-people-on-process-and-design-level/':
    '/heuristics/eventstorming-split-and-merge-above-7-people/',
};

/** Rules the sync recorded for itself: a slug renamed in Notion, or a page
 *  deliberately retired there. See `recordRedirects` in sync-notion.ts — the
 *  run that breaks a URL is the run that keeps the promise. */
function recordedRules() {
  let text = '';
  try { text = readFileSync('data/retired-urls.csv', 'utf8'); } catch { return []; }
  return text.trim().split('\n').slice(1).filter(Boolean).map((line) => {
    const [from, kind, to] = line.split(',');
    return { from, kind, to };
  });
}

const esc = (p) => p.replace(/[.?*+^$[\]\\(){}|]/g, '\\$&');
const L = [];
const section = (title) => { L.push('', `# --- ${title} ${'-'.repeat(Math.max(0, 62 - title.length))}`); };

L.push('# Generated by scripts/build-redirects.mjs — do not edit by hand.');
L.push('# The URL contract: 967 addresses, each served, redirected once, or Gone.');
L.push('# Inputs are the inventories in data/. See AGENTS.md, "The URL contract".');
L.push('');
// Branded error pages. Without these the host serves its own: an unbranded 404
// with no way back into the site, and — for the 261 URLs we retire on purpose —
// a bare "Gone" that tells a person nothing.
L.push('ErrorDocument 404 /404.html');
// Astro special-cases 404.astro into dist/404.html; every other page, this
// one included, is a directory with an index.html.
L.push('ErrorDocument 410 /410/');
L.push('');
// Every content page also ships its own markdown (see src/lib/markdown-page.ts).
// LiteSpeed would otherwise send .md as application/octet-stream, which makes a
// browser download the file instead of showing it — and tells a crawler nothing
// about what it is.
L.push('<IfModule mod_mime.c>');
L.push('AddType text/markdown .md');
L.push('AddCharset UTF-8 .md');
L.push('</IfModule>');
L.push('');
L.push('<IfModule mod_rewrite.c>');
L.push('RewriteEngine On');

section('0. One hostname');
// WordPress sent www to the bare domain; a static site does not, so after the
// cutover both hostnames answered 200 with the same 328 pages. The canonical
// tags said which one counts, but two addresses for every page is a thing to
// state in a rule rather than leave to a crawler's judgement.
//
// First, so a www request is normalised before any path rule sees it, and
// absolute because the host is the part being changed. The 967 inherited
// addresses are all bare-domain, so nothing in the URL contract goes through
// here — check-redirects.mjs skips host-conditional rules for that reason.
L.push('RewriteCond %{HTTP_HOST} ^www\\.virtualddd\\.com$ [NC]');
L.push('RewriteRule ^(.*)$ https://virtualddd.com/$1 [R=301,L]');

section('1. Legacy rules carried over from the Redirection plugin');
L.push(`# ${legacy.length} rules, normalised to a trailing slash so each is a single hop.`);
for (const r of legacy) {
  L.push(`RewriteRule ^${esc(r.from.slice(1))}?$ ${r.to} [R=301,L]`);
}

section('2. Navigation landing pages');
L.push('# The nav pointed at curated Divi pages; the rebuild serves those at the');
L.push('# archive path, so each collapses onto its section.');
for (const [from, to] of Object.entries(LANDING)) {
  L.push(`RewriteRule ^${esc(from.slice(1))}?$ ${to} [R=301,L]`);
}

section('3. Feeds');
L.push('# The old /feed/ and its per-type feeds were stale (last built March 2024)');
L.push('# built March 2024, CPTs excluded) but subscribers still exist.');
L.push('RewriteRule ^feed/?$ /rss.xml [R=301,L]');
L.push('RewriteRule ^(sessions|facilitating-archdes|open-space|heuristics)/feed/?$ /rss.xml [R=301,L]');
L.push('RewriteRule ^comments/feed/?$ /rss.xml [R=301,L]');

section('4. ddd-crew reposts → /ddd-crew/');
for (const [from, to] of Object.entries(GITHUB_REPOS)) {
  L.push(`RewriteRule ^github-repositories/${esc(from)}/?$ /ddd-crew/${to}/ [R=301,L]`);
}

section('5. Team member pages → organisers');
for (const [from, to] of Object.entries(TEAM)) {
  L.push(`RewriteRule ^dipl-team-member/${esc(from)}/?$ /organisers/${to}/ [R=301,L]`);
}
L.push('RewriteRule ^dipl-team-member/?$ /organisers/ [R=301,L]');

section(`6. Session recordings (${recordings.length} of ${videos.length} videos)`);
L.push('# Same slug as a session: the session page has the video and the write-up.');
for (const v of recordings) {
  L.push(`RewriteRule ^videos/${esc(v.slug)}/?$ /sessions/${v.slug}/ [R=301,L]`);
}

section(`7. Remaining video URLs (${foreign}) — Gone`);
L.push('# Imported third-party conference talks; not Virtual DDD content. The full');
L.push('# inventory is kept in data/videos-inventory.csv so the section can return');
L.push('# later at these exact URLs.');
L.push('RewriteRule ^videos/ - [G,L]');
L.push('RewriteRule ^videos_tag/ - [G,L]');

section('8. Tag archives → the filtered index');
L.push('# There was once a page per tag. The indexes read ?tag= and pre-select');
L.push('# it (src/lib/filter-url.ts); an unknown tag shows the full archive.');
L.push('RewriteRule ^sessions_tag/([^/]+)/?$ /sessions/?tag=$1 [R=301,L,QSA]');
L.push('RewriteRule ^facilitating-archdes_tag/([^/]+)/?$ /facilitating-archdes/?tag=$1 [R=301,L,QSA]');
L.push('RewriteRule ^heuristics_tag/([^/]+)/?$ /heuristics/?tag=$1 [R=301,L,QSA]');
L.push('# Open Space has five items and no filter UI, so its tags go to the index.');
L.push('RewriteRule ^open-space_tag/([^/]+)/?$ /open-space/ [R=301,L]');

section('9. Category, author and other generated archives — Gone');
for (const p of ['sessions_category', 'heuristics_category', 'dipl-team-member-category', 'category', 'tag', 'author']) {
  L.push(`RewriteRule ^${p}/ - [G,L]`);
}

section('10. Pages that were never real — Gone');
for (const p of GONE_PAGES) {
  L.push(`RewriteRule ^${esc(p.slice(1))}?$ - [G,L]`);
}

section('11. Retired slugs (editorial merges and renames)');
L.push('# Content that moved after the URL inventory was taken: the old address');
L.push('# keeps working. The hand-written ones first, then whatever the sync');
L.push('# recorded when a slug changed or a page was retired in Notion.');
for (const [from, to] of Object.entries(RETIRED)) {
  L.push(`RewriteRule ^${esc(from.slice(1))}?$ ${to} [R=301,L]`);
}
for (const r of recordedRules()) {
  if (Object.hasOwn(RETIRED, r.from)) continue; // a hand-written rule wins
  L.push(r.kind === '410'
    ? `RewriteRule ^${esc(r.from.slice(1))}?$ - [G,L]`
    : `RewriteRule ^${esc(r.from.slice(1))}?$ ${r.to} [R=301,L]`);
}

section('12. Pending: reading list and book club');
L.push('# Decided to keep, but the destinations need editorial content first.');
L.push('# Uncomment each line the day its page ships.');
L.push('# RewriteRule ^papers/?$ /reading-list/ [R=301,L]');
L.push('# RewriteRule ^books/?$ /reading-list/ [R=301,L]');
L.push('# /book-club/ stays a real page — no rule needed.');
L.push('RewriteRule ^papers/?$ - [G,L]');
L.push('RewriteRule ^books/?$ - [G,L]');

L.push('</IfModule>');
L.push('');

// `--out=` lets the test regenerate somewhere harmless and compare, rather
// than overwriting the file it is checking.
const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'public/.htaccess';
writeFileSync(out, L.join('\n'));

const rules = L.filter((l) => l.startsWith('RewriteRule')).length;
console.log(`build-redirects: ${rules} rules -> ${out}`);
console.log(`  legacy ${legacy.length} · landing ${Object.keys(LANDING).length} · team ${Object.keys(TEAM).length + 1}`);
console.log(`  video recordings 301 ${recordings.length} · other videos 410 ${foreign}`);
