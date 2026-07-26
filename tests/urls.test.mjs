/** Redirect coverage: every indexed WordPress URL is deliberately handled.
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

test('every indexed WordPress URL is served, redirected or Gone', () => {
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
  assert.equal(served + redirected + gone, 967, 'the Phase 1 inventory should be fully accounted for');
  // Guard rails, not exact values: content can grow, but a collapse in any
  // bucket means a rule stopped matching.
  assert.ok(served >= 290, `only ${served} URLs are served by a page`);
  assert.ok(redirected >= 400, `only ${redirected} URLs redirect`);
});
