/** Redirect coverage: every inherited URL is deliberately handled.
 *
 * This runs `scripts/check-redirects.mjs`, which simulates mod_rewrite against
 * `public/.htaccess`. A simulation is not the real thing — Apache/LiteSpeed is
 * the authority — so `scripts/verify-live.mjs` re-checks the same list against
 * a deployed host at cutover. This test catches the mistakes that are cheap to
 * catch early: a rule that points at a page which doesn't exist, a URL nobody
 * thought about, a redirect chain.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

test('every inherited URL is served, redirected or Gone', () => {
  let out;
  try {
    out = execFileSync('node', ['scripts/check-redirects.mjs'], { encoding: 'utf8' });
  } catch (e) {
    assert.fail(`unhandled URLs:\n${e.stdout}${e.stderr}`);
  }
  assert.match(out, /all indexed URLs are handled/);

  const n = (label) => Number(out.match(new RegExp(`${label}\\s*:\\s*(\\d+)`))?.[1] ?? 0);
  const served = n('served by a page');
  const redirected = n('redirected \\(301\\)');
  const gone = n('gone \\(410\\)');
  assert.equal(served + redirected + gone, 967, 'the URL inventory should be fully accounted for');
  // Guard rails, not exact values: content can grow, but a collapse in any
  // bucket means a rule stopped matching.
  assert.ok(served >= 290, `only ${served} URLs are served by a page`);
  assert.ok(redirected >= 400, `only ${redirected} URLs redirect`);
});

test('www redirects to the bare domain, once, before anything else', () => {
  // After the cutover both hostnames served every page with a 200. This rule
  // is the site's answer to "which address is the site", and it has two
  // properties worth pinning: it is guarded by a host condition (or its
  // catch-all pattern would swallow every path), and it comes first (or a www
  // request would take a path hop before being sent home, making two).
  const lines = readFileSync('public/.htaccess', 'utf8').split('\n');
  const i = lines.findIndex((l) => /^RewriteCond\s+%\{HTTP_HOST\}\s+\^www\\?\./.test(l));
  assert.ok(i >= 0, 'no host condition for www in public/.htaccess');

  const rule = lines[i + 1];
  assert.match(rule, /^RewriteRule\s+\^\(\.\*\)\$\s+https:\/\/virtualddd\.com\/\$1\s+\[R=301,L\]/,
    `the line after the www condition is not the redirect: ${rule}`);

  const first = lines.findIndex((l) => l.startsWith('RewriteRule'));
  assert.equal(first, i + 1, 'a path rule runs before the www redirect, which costs a second hop');
});
