/** Contract assertions over the built site — no browser, about a second.
 *
 * Everything here is a promise to somebody outside this repo: a search engine,
 * a feed reader, a person with a bookmark. Breaking one of these is invisible
 * locally and expensive months later, so these block the deploy.
 *
 * Content quality — anything an editor can break from Notion — is deliberately
 * *not* here; it lives in tests/content/ and reports without blocking. See
 * CLAUDE.md, "Testing".
 *
 * Run after `npm run build`.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pages, meta, attr, DIST } from './helpers.mjs';

let all;
before(() => {
  assert.ok(existsSync(DIST), 'dist/ missing — run `npm run build` first');
  all = pages();
  assert.ok(all.length > 300, `expected 300+ pages, found ${all.length}`);
});

describe('every page', () => {
  test('has a non-empty <title>', () => {
    for (const p of all) {
      const title = attr(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(title && title.trim(), `${p.path} has no <title>`);
    }
  });

  test('has an absolute canonical matching its own path', () => {
    for (const p of all) {
      const c = attr(p.html, /<link rel="canonical" href="([^"]*)"/);
      assert.ok(c, `${p.path} has no canonical`);
      assert.ok(c.startsWith('https://'), `${p.path} canonical is not absolute: ${c}`);
      // ddd-crew pages canonicalise upstream on purpose (CC BY-SA, Phase 4).
      if (!p.path.startsWith('/ddd-crew/') || p.path === '/ddd-crew/') {
        assert.equal(new URL(c).pathname, p.path, `${p.path} canonical points elsewhere: ${c}`);
      }
    }
  });

  test('has Open Graph and Twitter card tags', () => {
    for (const p of all) {
      for (const tag of ['og:title', 'og:type', 'og:url', 'og:image', 'og:site_name']) {
        assert.ok(meta(p.html, tag), `${p.path} missing ${tag}`);
      }
      assert.equal(meta(p.html, 'twitter:card'), 'summary_large_image', `${p.path} twitter:card`);
      assert.ok(meta(p.html, 'og:image').startsWith('https://'), `${p.path} og:image must be absolute`);
    }
  });

  test('has exactly one <h1>', () => {
    // Editors cannot break this from Notion any more — the sync demotes body
    // headings — so a failure here means the templates regressed.
    for (const p of all) {
      const n = (p.html.match(/<h1[\s>]/g) ?? []).length;
      assert.equal(n, 1, `${p.path} has ${n} h1 elements`);
    }
  });

  test('never renders undefined, NaN or [object Object]', () => {
    const bad = all
      .filter((p) => /\b(undefined|NaN|\[object Object\])\b/.test(p.html.replace(/<script[\s\S]*?<\/script>/g, '')))
      .map((p) => p.path);
    assert.deepEqual(bad, [], `placeholder values leaked into: ${bad.join(', ')}`);
  });
});

describe('internal links', () => {
  test('all resolve to a page that exists', () => {
    const paths = new Set(all.map((p) => p.path));
    const broken = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        if (/\.(xml|txt|ics|png|jpg|jpeg|webp|svg|ico|css|js)$/.test(href)) {
          if (!existsSync(`${DIST}${href}`)) broken.add(`${href} (from ${p.path})`);
          continue;
        }
        if (!paths.has(href)) broken.add(`${href} (from ${p.path})`);
      }
    }
    assert.deepEqual([...broken], [], `broken internal links:\n${[...broken].join('\n')}`);
  });

  test('all end in a trailing slash, matching trailingSlash: always', () => {
    const bad = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = m[1];
        if (href === '/' || /\.[a-z0-9]{2,5}$/.test(href)) continue;
        if (!href.endsWith('/')) bad.add(`${href} (from ${p.path})`);
      }
    }
    assert.deepEqual([...bad], [], `links that would 301:\n${[...bad].join('\n')}`);
  });
});

describe('structured data', () => {
  test('every JSON-LD block parses and is typed', () => {
    for (const p of all) {
      for (const m of p.html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
        let data;
        assert.doesNotThrow(() => { data = JSON.parse(m[1]); }, `${p.path} has invalid JSON-LD`);
        assert.equal(data['@context'], 'https://schema.org', `${p.path} JSON-LD @context`);
        const nodes = data['@graph'] ?? [data];
        for (const node of nodes) assert.ok(node['@type'], `${p.path} JSON-LD node without @type`);
      }
    }
  });

  test('sessions are Events and stories are Articles', () => {
    // The shape, not the contents — whether a given session filled in its
    // fields is an editorial question (tests/content/).
    const sessions = all.filter((p) => /^\/sessions\/[^/]+\/$/.test(p.path));
    assert.ok(sessions.length > 100, `expected 100+ session pages, got ${sessions.length}`);
    for (const p of sessions) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const event = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Event');
      assert.ok(event, `${p.path} has no Event`);
      assert.equal(event.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
    }
    for (const p of all.filter((x) => /^\/facilitating-archdes\/[^/]+\/$/.test(x.path))) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      assert.ok(JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Article'), `${p.path} has no Article`);
    }
  });
});

describe('the upcoming/past split', () => {
  // The home and session-index heroes must ship *every* upcoming session, or
  // the client-side sweep has nothing to promote and the pick silently freezes
  // at build time again.
  const upcomingInContent = () => {
    const dir = 'src/content/sessions';
    const grace = 3 * 60 * 60 * 1000;
    return readdirSync(dir).filter((f) => f.endsWith('.md')).filter((f) => {
      const md = readFileSync(join(dir, f), 'utf8');
      const status = md.match(/^status:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
      const dt = md.match(/^datetime:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
      return status === 'Published' && dt && +new Date(dt) + grace > Date.now();
    }).length;
  };

  for (const path of ['/', '/sessions/']) {
    test(`${path} ships every upcoming session, not just the first`, () => {
      const page = all.find((p) => p.path === path);
      const rendered = (page.html.match(/data-test="next-session"/g) ?? []).length;
      assert.equal(rendered, upcomingInContent(),
        `${path} rendered ${rendered} upcoming sessions; the sweep can only choose between what ships`);
    });
  }

  test('the archive runs from yesterday backwards', () => {
    // Each card carries its date on an inner <time data-iso>, so read the
    // results region in document order rather than guessing from the anchor.
    const page = all.find((p) => p.path === '/sessions/');
    const start = page.html.indexOf('data-test="results"');
    const end = page.html.indexOf('id="noresults"');
    assert.ok(start > 0 && end > start, 'could not find the results region on /sessions/');
    const region = page.html.slice(start, end);

    const isos = [...region.matchAll(/data-iso="([^"]+)"/g)].map((m) => +new Date(m[1]));
    assert.ok(isos.length > 100, `expected the whole archive, read ${isos.length} dates`);
    for (let i = 1; i < isos.length; i++) {
      assert.ok(isos[i] <= isos[i - 1],
        `out of order at ${i}: ${new Date(isos[i]).toISOString()} follows ${new Date(isos[i - 1]).toISOString()}`);
    }
    assert.ok(isos[0] < Date.now(), 'the archive leads with a session that has not happened yet');
  });

  test('the home page lists its latest sessions newest first', () => {
    const page = all.find((p) => p.path === '/');
    const start = page.html.indexOf('Latest sessions');
    const end = page.html.indexOf('Follow us on Bluesky');
    assert.ok(start > 0 && end > start, 'could not find the latest-sessions region on the home page');
    const isos = [...page.html.slice(start, end).matchAll(/data-iso="([^"]+)"/g)].map((m) => +new Date(m[1]));
    assert.ok(isos.length >= 4, `expected several latest sessions, read ${isos.length}`);
    for (let i = 1; i < isos.length; i++) {
      assert.ok(isos[i] <= isos[i - 1], `latest sessions out of order at ${i}`);
    }
  });
});

describe('feeds and machine-readable files', () => {
  test('sitemap, RSS, robots.txt and llms.txt exist', () => {
    for (const f of ['sitemap-index.xml', 'rss.xml', 'robots.txt', 'llms.txt', '.htaccess']) {
      assert.ok(existsSync(`${DIST}/${f}`), `${f} missing from the build`);
    }
  });

  test('RSS lists sessions and stories, newest first', () => {
    const xml = readFileSync(`${DIST}/rss.xml`, 'utf8');
    const dates = [...xml.matchAll(/<pubDate>([^<]+)<\/pubDate>/g)].map((m) => +new Date(m[1]));
    assert.ok(dates.length >= 20, `expected 20+ feed items, got ${dates.length}`);
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i] <= dates[i - 1], 'feed items are not newest-first');
    }
    assert.match(xml, /\/sessions\//);
    assert.match(xml, /\/facilitating-archdes\//);
  });

  test('robots.txt allows AI crawlers and points at the sitemap', () => {
    const txt = readFileSync(`${DIST}/robots.txt`, 'utf8');
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
      assert.match(txt, new RegExp(`User-agent: ${bot}\\s*\\nAllow: /`), `${bot} not allowed`);
    }
    assert.match(txt, /Sitemap: https:\/\/virtualddd\.com\/sitemap-index\.xml/);
    // Blocking these would strand the 289 legacy tag redirects.
    assert.doesNotMatch(txt, /^Disallow: \/\*\?tag=/m);
  });

  test('every session offering a calendar file has one', () => {
    const offering = all.filter((p) => p.html.includes('data-test="add-to-calendar"'));
    for (const p of offering) {
      const ics = `${DIST}${p.path}event.ics`;
      assert.ok(existsSync(ics), `${p.path} offers a calendar file that wasn't built`);
      const body = readFileSync(ics, 'utf8');
      assert.match(body, /BEGIN:VCALENDAR/);
      assert.match(body, /DTSTART:\d{8}T\d{6}Z/);
    }
  });
});

describe('the deploy', () => {
  test('stays under the size we agreed to ship', () => {
    // prune-dist.mjs runs as part of the build and drops the unreferenced
    // originals Astro emits beside its .webp. When it silently stops working
    // the deploy nearly doubles, and rsync over SSH to shared hosting is the
    // one place that hurts. A ceiling, not an exact figure — content grows.
    const CEILING_MB = 50;
    const bytes = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
      const p = join(dir, e.name);
      return sum + (e.isDirectory() ? bytes(p) : statSync(p).size);
    }, 0);
    const mb = bytes(DIST) / 1024 / 1024;
    assert.ok(mb < CEILING_MB, `dist is ${mb.toFixed(1)} MB, over the ${CEILING_MB} MB ceiling — has prune-dist stopped working?`);
  });

  test('references no asset that was pruned away', () => {
    const missing = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/(?:src|href)="(\/_astro\/[^"]+)"/g)) {
        if (!existsSync(`${DIST}${m[1]}`)) missing.add(`${m[1]} (from ${p.path})`);
      }
    }
    assert.deepEqual([...missing], [], `pruned assets still referenced:\n${[...missing].join('\n')}`);
  });
});
