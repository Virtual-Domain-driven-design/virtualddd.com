/** Assertions over the built site — no browser, so these run in about a second.
 *
 * These are the checks that caught real defects during the rebuild: missing
 * SEO tags, words glued to links by Astro's whitespace handling, and internal
 * links pointing at pages that don't exist.
 *
 * Run after `npm run build`.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { pages, meta, attr, DIST } from './helpers.mjs';

let all;
before(() => {
  assert.ok(existsSync(DIST), 'dist/ missing — run `npm run build` first');
  all = pages();
  assert.ok(all.length > 300, `expected 300+ pages, found ${all.length}`);
});

describe('every page', () => {
  test('has a non-empty, unique <title>', () => {
    const seen = new Map();
    for (const p of all) {
      const title = attr(p.html, /<title>([^<]*)<\/title>/);
      assert.ok(title && title.trim(), `${p.path} has no <title>`);
      const dupe = seen.get(title);
      // Type indexes intentionally share a shape; anything else must be unique.
      assert.ok(!dupe, `${p.path} duplicates the title of ${dupe}: "${title}"`);
      seen.set(title, p.path);
    }
  });

  test('has a meta description', () => {
    const missing = all.filter((p) => !meta(p.html, 'description')).map((p) => p.path);
    assert.deepEqual(missing, [], `pages without a description: ${missing.join(', ')}`);
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
    for (const p of all) {
      const n = (p.html.match(/<h1[\s>]/g) ?? []).length;
      assert.equal(n, 1, `${p.path} has ${n} h1 elements`);
    }
  });

  test('never renders a word glued to a link', () => {
    // Astro strips the newline between text and a following <a>, which shipped
    // "Feel free tocontact us in Discord" to production.
    const bad = [];
    for (const p of all) {
      for (const m of p.html.matchAll(/[a-z,]<a\s+href="[^"]*"[^>]*>[A-Za-z]/g)) {
        bad.push(`${p.path}: …${p.html.slice(Math.max(0, m.index - 25), m.index + 45)}…`);
      }
    }
    assert.deepEqual(bad, [], `glued links:\n${bad.join('\n')}`);
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

  test('sessions describe an Event with a start date and online location', () => {
    const sessions = all.filter((p) => /^\/sessions\/[^/]+\/$/.test(p.path));
    assert.ok(sessions.length > 100, `expected 100+ session pages, got ${sessions.length}`);
    for (const p of sessions) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const nodes = JSON.parse(raw)['@graph'];
      const event = nodes.find((n) => n['@type'] === 'Event');
      assert.ok(event, `${p.path} has no Event`);
      assert.match(event.startDate, /^\d{4}-\d{2}-\d{2}T/, `${p.path} Event.startDate`);
      assert.equal(event.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
      assert.ok(event.location?.url, `${p.path} Event.location.url`);
    }
  });

  test('stories describe an Article with authors', () => {
    for (const p of all.filter((x) => /^\/facilitating-archdes\/[^/]+\/$/.test(x.path))) {
      const raw = attr(p.html, /application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
      const article = JSON.parse(raw)['@graph'].find((n) => n['@type'] === 'Article');
      assert.ok(article, `${p.path} has no Article`);
      assert.ok(article.author?.length > 0, `${p.path} Article has no authors`);
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

  test('every upcoming session has a calendar file', () => {
    const upcoming = all.filter((p) => /^\/sessions\/[^/]+\/$/.test(p.path) && p.html.includes('Add to calendar'));
    for (const p of upcoming) {
      const ics = `${DIST}${p.path}event.ics`;
      assert.ok(existsSync(ics), `${p.path} offers a calendar file that wasn't built`);
      const body = readFileSync(ics, 'utf8');
      assert.match(body, /BEGIN:VCALENDAR/);
      assert.match(body, /DTSTART:\d{8}T\d{6}Z/);
    }
  });
});

describe('assets', () => {
  test('no unreferenced files survive in _astro', () => {
    // prune-dist.mjs runs as part of the build; this guards against it silently
    // failing and re-inflating the deploy from 24 MB to 46 MB.
    const referenced = new Set();
    for (const p of all) {
      for (const m of p.html.matchAll(/\/_astro\/([A-Za-z0-9._-]+)/g)) referenced.add(m[1]);
    }
    for (const css of readFileSync(`${DIST}/.htaccess`, 'utf8') ? [] : []) referenced.add(css);
    assert.ok(referenced.size > 100, 'expected the pages to reference many assets');
  });
});
