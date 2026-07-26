/** Content quality — things an *editor* can break from Notion.
 *
 * Kept apart from the blocking suite on purpose. These fail because of what
 * someone wrote, not because of what someone coded, and `npm test` must not
 * turn a typo into a failed deploy: CLAUDE.md's standing invariant is that
 * publishing degrades to a script and a commit, never an outage.
 *
 * So this suite reports. Run it, read it, fix it in Notion, re-sync. CI runs it
 * for the record and does not gate the deploy on it.
 *
 * A defect here is real — it just belongs to the person holding the Notion
 * page, and the message says which page and what to change.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pages, meta, attr, text, DIST } from '../helpers.mjs';

let all;
before(() => {
  assert.ok(existsSync(DIST), 'dist/ missing — run `npm run build` first');
  all = pages();
});

describe('what the editors control', () => {
  test('no two pages claim the same title', () => {
    // Two pages competing for one phrase split their own search results. The
    // fix is in Notion: merge the rows, or retitle one.
    const seen = new Map();
    const clashes = [];
    for (const p of all) {
      const title = attr(p.html, /<title>([^<]*)<\/title>/);
      if (!title) continue;
      const first = seen.get(title);
      if (first) clashes.push(`${p.path} and ${first} share "${title}"`);
      else seen.set(title, p.path);
    }
    assert.deepEqual(clashes, [], `duplicate titles:\n${clashes.join('\n')}`);
  });

  test('every page has a meta description', () => {
    const missing = all.filter((p) => !meta(p.html, 'description')).map((p) => p.path);
    assert.deepEqual(missing, [], `pages without a description: ${missing.join(', ')}`);
  });

  test('no word is glued to a link', () => {
    // Usually Astro's whitespace handling, which is a code fix — but it also
    // catches a missing space in the Notion source, which is an editorial one.
    const bad = [];
    for (const p of all) {
      for (const m of p.html.matchAll(/[a-z,]<a\s+href="[^"]*"[^>]*>[A-Za-z]/g)) {
        bad.push(`${p.path}: …${p.html.slice(Math.max(0, m.index - 25), m.index + 45)}…`);
      }
    }
    assert.deepEqual(bad, [], `glued links:\n${bad.join('\n')}`);
  });

  test('stories name their authors', () => {
    const anonymous = [];
    for (const p of all.filter((x) => /^\/facilitating-archdes\/[^/]+\/$/.test(x.path))) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const article = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Article');
      if (!article?.author?.length) anonymous.push(p.path);
    }
    assert.deepEqual(anonymous, [], `stories with no author in Notion: ${anonymous.join(', ')}`);
  });

  test('guests on an upcoming session have a bio', () => {
    // A speaker row created from a session title holds a name and nothing
    // else, and the Guests section stays hidden until someone has a Bio. That
    // is fine for the archive; the session about to happen is the one worth
    // filling in. Write a Bio in the Session Guests database — a role or a
    // link alone will not open the section — and it appears on the next sync.
    const bare = [];
    for (const p of all.filter((x) => /^\/sessions\/[^/]+\/$/.test(x.path))) {
      if (!p.html.includes('data-test="add-to-calendar"')) continue; // upcoming only
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const event = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Event');
      const credit = attr(p.html, /data-test="guest-credit"[^>]*>[\s\S]*?<strong[^>]*>([^<]+)/);
      for (const name of text(credit ?? '').split(', ').filter(Boolean)) {
        const node = [].concat(event?.performer ?? []).find((x) => x.name === name);
        if (!node?.description) bare.push(`${p.path}: ${name} has no bio`);
      }
    }
    assert.deepEqual(bare, [], bare.join('\n'));
  });

  test('a body does not skip a heading level', () => {
    // Someone navigating by heading hears a level that is not there. The cause
    // is nearly always a Notion page that opens with a heading_3, so the fix is
    // in Notion — which is why this reports rather than blocks.
    //
    // ddd-crew is excluded: those pages are republished from someone else's
    // README under CC BY-SA, and their structure is not ours to correct.
    const skipped = [];
    for (const p of all) {
      if (p.path.startsWith('/ddd-crew/')) continue;
      const levels = [...p.html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
      const jumps = levels
        .map((l, i) => (i && l > levels[i - 1] + 1 ? `h${levels[i - 1]}→h${l}` : null))
        .filter(Boolean);
      if (jumps.length) skipped.push(`${p.path}: ${[...new Set(jumps)].join(', ')}`);
    }
    assert.deepEqual(skipped, [], skipped.join('\n'));
  });

  test('sessions carry a start time and an online location', () => {
    const bad = [];
    for (const p of all.filter((x) => /^\/sessions\/[^/]+\/$/.test(x.path))) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const event = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Event');
      if (!event) { bad.push(`${p.path}: no Event`); continue; }
      if (!/^\d{4}-\d{2}-\d{2}T/.test(event.startDate ?? '')) bad.push(`${p.path}: no start time`);
      if (!event.location?.url) bad.push(`${p.path}: no joining URL`);
    }
    assert.deepEqual(bad, [], bad.join('\n'));
  });
});
