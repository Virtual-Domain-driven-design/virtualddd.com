/**
 * Prove that every inherited URL is deliberately handled.
 *
 * Replays the generated .htaccess against the 967-address inventory in data/:
 * each one must be served by a built page, redirected once to a page that
 * exists, or returned as 410 Gone. Nothing is allowed to simply 404.
 *
 * Simulation, not proof — only a real server proves the rules are honoured.
 * Run `npm run verify:live <url>` against a deployed host for that.
 */
import { existsSync, readFileSync } from 'node:fs';

const htaccess = readFileSync('public/.htaccess', 'utf8');
const urls = readFileSync('data/live-urls.txt', 'utf8').trim().split('\n');

// Parse: RewriteRule <pattern> <target> [flags]
const rules = [];
for (const line of htaccess.split('\n')) {
  const m = line.match(/^RewriteRule\s+(\S+)\s+(\S+)\s+\[([^\]]*)\]/);
  if (!m) continue;
  const [, pattern, target, flags] = m;
  rules.push({
    re: new RegExp(pattern),
    target,
    gone: /\bG\b/.test(flags),
    redirect: /R=30[12]/.test(flags),
    raw: line,
  });
}

const served = (path) =>
  existsSync(`dist${path}index.html`) || existsSync(`dist${path.replace(/\/$/, '')}.html`);

const stats = { served: 0, redirected: 0, gone: 0 };
const problems = [];

for (const url of urls) {
  const rel = url.replace(/^\//, ''); // mod_rewrite sees the path without the leading slash
  const rule = rules.find((r) => r.re.test(rel));

  if (!rule) {
    if (served(url)) { stats.served++; continue; }
    problems.push({ url, why: 'no rule and no page — would 404' });
    continue;
  }
  if (rule.gone) { stats.gone++; continue; }
  if (!rule.redirect) { problems.push({ url, why: `rule is neither redirect nor gone: ${rule.raw}` }); continue; }

  // Resolve $1 back-references so the target can be checked.
  const target = rule.target.replace(/\$(\d)/g, (_, n) => (rel.match(rule.re) ?? [])[Number(n)] ?? '');
  const [path] = target.split('?');
  if (!path.startsWith('/')) { problems.push({ url, why: `target is not absolute: ${target}` }); continue; }
  if (!served(path)) {
    problems.push({ url, why: `redirects to ${target}, which is not in dist` });
    continue;
  }
  // A redirect whose target itself redirects is a wasted hop.
  const chained = rules.find((r) => r.redirect && r.re.test(path.replace(/^\//, '')));
  if (chained) problems.push({ url, why: `redirect chain: → ${path} → ${chained.target}` });
  stats.redirected++;
}

console.log(`checked ${urls.length} indexed URLs against ${rules.length} rules`);
console.log(`  served by a page : ${stats.served}`);
console.log(`  redirected (301) : ${stats.redirected}`);
console.log(`  gone (410)       : ${stats.gone}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p.url} — ${p.why}`);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log('\nall indexed URLs are handled.');
