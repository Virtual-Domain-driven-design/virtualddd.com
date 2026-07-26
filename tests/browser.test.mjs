/** Behaviour, in a real browser, against the *built* site.
 *
 * These cover what static HTML checks cannot: layout at real viewport widths,
 * and the progressive-enhancement scripts. Every failure here has a precedent —
 * the mobile overflow that affected 14 of 24 story pages was invisible to every
 * other kind of check.
 *
 * **Selectors are the contract.** Tests here select only `[data-test]` hooks and
 * `js-*` behaviour classes, never a styling class and never visible copy, so
 * restyling a section cannot break them. See CLAUDE.md, "The test surface".
 *
 * Run after `npm run build`. Sampled rather than exhaustive so it stays quick;
 * `npm run test:full` widens the sample.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './helpers.mjs';

const FULL = process.env.TEST_FULL === '1';
const sample = (dir, base, n) => {
  const all = readdirSync(`src/content/${dir}`)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `${base}${f.replace(/\.md$/, '')}/`);
  return FULL ? all : all.slice(0, n);
};

let server, base, browser;

before(async () => {
  ({ server, base } = await serveDist());
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

/** Count what the visitor can actually see. */
const visible = (page, selector) =>
  page.$$eval(selector, (els) => els.filter((e) => e.offsetParent !== null || e.getClientRects().length).length);

describe('layout', () => {
  // 360px is the narrowest phone worth supporting; 390 is a current iPhone.
  for (const width of [360, 390]) {
    test(`no horizontal overflow at ${width}px`, async () => {
      const ctx = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await ctx.newPage();
      const paths = [
        '/', '/sessions/', '/facilitating-archdes/', '/open-space/', '/heuristics/',
        '/ddd-crew/', '/podcasts/', '/organisers/', '/book-club/', '/about-us/', '/ddd-heuristics/',
        ...sample('sessions', '/sessions/', 8),
        ...sample('stories', '/facilitating-archdes/', 8),
        ...sample('heuristics', '/heuristics/', 5),
        ...sample('ddd-crew', '/ddd-crew/', 4),
        ...sample('open-spaces', '/open-space/', 3),
      ];
      const bad = [];
      for (const p of paths) {
        // 'load', not 'domcontentloaded': before the stylesheet applies the
        // carousels are briefly unstyled block elements and every page reads as
        // 400-470px wide. Measuring then produces confident nonsense.
        await page.goto(base + p, { waitUntil: 'load' });
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        if (w > width + 1) {
          const who = await page.evaluate((vw) =>
            [...document.querySelectorAll('main *')]
              .filter((e) => e.getBoundingClientRect().width > vw + 30)
              .slice(0, 2)
              .map((e) => `${e.tagName.toLowerCase()}.${(e.className || '').toString().split(' ')[0]}`), width);
          bad.push(`${p} → ${w}px (${who.join(', ')})`);
        }
      }
      await ctx.close();
      assert.deepEqual(bad, [], `pages scrolling sideways:\n${bad.join('\n')}`);
    });
  }
});

describe('the next session', () => {
  // The rule itself — which of several upcoming sessions is next — is proved in
  // tests/unit/upcoming.test.mjs, because the site has only one upcoming
  // session to render. What is proved here is the wiring: that the choice is
  // made in the browser, from the clock, rather than frozen into the build.
  for (const path of ['/', '/sessions/']) {
    test(`${path} chooses its featured session from the clock, not the build`, async () => {
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });

      const heroes = await page.$$('[data-test="next-session"]');
      if (!heroes.length) {
        await page.close();
        return; // nothing scheduled; the section is absent by design
      }
      assert.equal(await visible(page, '[data-test="next-session"]'), 1,
        'exactly one upcoming session should be on show');

      // The session on show must be one that has not finished.
      const shownIso = await page.$eval('[data-test="next-session"]:not([hidden])', (el) => el.dataset.iso);
      assert.ok(new Date(shownIso).getTime() + 3 * 60 * 60 * 1000 > Date.now(),
        `the featured session (${shownIso}) has already been`);
      await page.close();
    });

    test(`${path} stops featuring a session once it has been`, async () => {
      // The defect this guards: the pick was made at build time, so a session
      // that had already happened kept its RSVP hero and a countdown stuck at
      // "Happening now" until someone rebuilt the site.
      const page = await browser.newPage();
      await page.goto(base + path, { waitUntil: 'load' });
      const isos = await page.$$eval('[data-test="next-session"]', (els) => els.map((e) => e.dataset.iso));
      if (!isos.length) { await page.close(); return; }

      // A day after the last upcoming session, nothing should still be offered.
      const after = new Date(Math.max(...isos.map((i) => +new Date(i))) + 86400000);
      await page.clock.install({ time: after });
      await page.goto(base + path, { waitUntil: 'load' });
      await page.clock.runFor(1000);
      assert.equal(await visible(page, '[data-test="next-session"]'), 0,
        'a session that has been and gone is still being advertised');
      await page.close();
    });
  }
});

describe('filters and search', () => {
  test('the session archive searches, and every card left matches', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const total = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(total > 100, `expected the full archive, got ${total}`);

    await page.fill('[data-test="filter-search"]', 'eventstorming');
    await page.waitForTimeout(200);
    const filtered = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(filtered > 0 && filtered < total, `search did nothing useful: ${filtered} of ${total}`);

    // The filter hides; it does not delete. Anything still on show must match.
    const shown = await page.$$eval('[data-test="results"] [data-test="card"]:not([hidden])',
      (els) => els.map((e) => `${e.dataset.title ?? ''}|${e.dataset.tags ?? ''}`));
    assert.ok(shown.length > 0, 'a search with matches showed no cards');
    assert.ok(shown.every((t) => t.includes('eventstorming')), 'a non-matching card stayed on show');

    await page.click('[data-test="filter-reset"]');
    await page.waitForTimeout(200);
    const restored = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.equal(restored, total, 'reset did not restore the full list');
    await page.close();
  });

  test('filtering by tag shows only cards carrying that tag', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const tag = await page.$eval('[data-test="filter-tag"] option:nth-child(2)', (o) => o.value);
    await page.selectOption('[data-test="filter-tag"]', tag);
    await page.waitForTimeout(200);
    const shown = await page.$$eval('[data-test="results"] [data-test="card"]:not([hidden])',
      (els) => els.map((e) => e.dataset.tags ?? ''));
    assert.ok(shown.length > 0, `tag "${tag}" matched nothing`);
    assert.ok(shown.every((t) => t.includes(tag)), `a card without "${tag}" stayed on show`);
    await page.close();
  });

  test('a legacy tag URL lands pre-filtered', async () => {
    // 289 WordPress tag archives 301 here; landing on the unfiltered index
    // would make those redirects a lie.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/?tag=collaborative-modelling`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const n = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(n > 0 && n < 100, `expected a filtered subset, got ${n}`);
    assert.equal(await page.inputValue('[data-test="filter-tag"]'), 'collaborative modelling');
    await page.close();
  });

  test('an unknown tag shows everything rather than an empty page', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/?tag=this-tag-never-existed`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    const n = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(n > 100, `unknown tag emptied the archive (${n} shown)`);
    await page.close();
  });

  test('a filter and Load more do not hide matches from each other', async () => {
    // The archive reveals 30 at a time. If filtering did not reset that window,
    // a search could look empty while its matches sat in an unrevealed batch —
    // and the count would disagree with what is on screen.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const count = () => page.textContent('[data-test="result-count"]').then((t) => Number(t.match(/\d+/)[0]));
    const onScreen = () => page.$$eval('[data-test="results"] [data-test="card"]:not([hidden])', (e) => e.length);

    // Reveal everything, then filter: the window must go back to a first batch.
    for (let i = 0; i < 10 && await page.isVisible('#load-more'); i++) {
      await page.click('#load-more');
      await page.waitForTimeout(120);
    }
    await page.fill('[data-test="filter-search"]', 'design');
    await page.waitForTimeout(250);
    const matches = await count();
    assert.ok(matches > 0, 'the search matched nothing to test with');
    assert.ok(await onScreen() > 0, 'the count claims matches but nothing is on screen');

    // Everything the count promises must be reachable by pressing Load more.
    for (let i = 0; i < 20 && await page.isVisible('#load-more'); i++) {
      await page.click('#load-more');
      await page.waitForTimeout(120);
    }
    assert.equal(await onScreen(), matches,
      `the count says ${matches} but only ${await onScreen()} can be reached`);
    await page.close();
  });

  test('the stories index filters too', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/facilitating-archdes/`, { waitUntil: 'networkidle' });
    const total = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    const tag = await page.$eval('[data-test="filter-tag"] option:nth-child(2)', (o) => o.value);
    await page.selectOption('[data-test="filter-tag"]', tag);
    await page.waitForTimeout(200);
    const filtered = Number((await page.textContent('[data-test="result-count"]')).match(/\d+/)[0]);
    assert.ok(filtered > 0 && filtered <= total, `story tag filter returned ${filtered}`);
    await page.close();
  });

  test('the heuristics browser filters by type', async () => {
    const page = await browser.newPage();
    await page.goto(`${base}/heuristics/`, { waitUntil: 'networkidle' });
    const count = () => page.textContent('[data-test="result-count"]').then((t) => Number(t.match(/\d+/)[0]));
    const total = await count();

    await page.click('[data-test="type-filter"][data-type="guiding-heuristics"]');
    await page.waitForTimeout(200);
    const guiding = await count();
    assert.ok(guiding > 0 && guiding < total, `type filter returned ${guiding} of ${total}`);
    const types = await page.$$eval('[data-test="card"]:not([hidden])', (els) => els.map((e) => e.dataset.type));
    assert.ok(types.every((t) => t === 'guiding-heuristics'), 'a heuristic of another type stayed on show');

    await page.click('[data-test="filter-reset"]');
    await page.waitForTimeout(200);
    assert.equal(await count(), total, 'reset did not restore the full list');
    await page.close();
  });
});

describe('time', () => {
  test('dates render in the visitor timezone, over a server-rendered fallback', async () => {
    const tz = 'Pacific/Auckland'; // far from UTC, so a swap is unambiguous
    const ctx = await browser.newContext({ timezoneId: tz });
    const page = await ctx.newPage();

    // What ships in the HTML, before any script runs.
    await page.goto(`${base}/sessions/`, { waitUntil: 'domcontentloaded' });
    const fallback = await page.$eval('.js-local', (el) => el.textContent.trim());
    assert.ok(fallback.length > 0, 'no server-rendered date to fall back to');

    await page.waitForTimeout(400);
    const swapped = await page.$eval('.js-local', (el) => el.textContent.trim());
    const iso = await page.$eval('.js-local', (el) => el.dataset.iso);
    const expected = new Date(iso).toLocaleString('en-NZ', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    const hour = expected.match(/\d{1,2}/)[0];
    assert.match(swapped, new RegExp(`\\b${hour}`), `${swapped} is not the ${tz} time of ${iso}`);
    await ctx.close();
  });

  test('the countdown counts down, and turns over at the start', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const el = await page.$('.js-countdown[data-iso]');
    if (!el) { await page.close(); return; }
    const iso = await el.getAttribute('data-iso');

    // An hour before: it must be counting, and the numbers must move.
    await page.clock.install({ time: new Date(+new Date(iso) - 3600_000) });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.clock.runFor(1500);
    const first = await page.$eval('.js-countdown', (e) => e.textContent);
    assert.match(first, /\d/, `countdown showed "${first}" an hour before the start`);
    await page.clock.runFor(5000);
    const later = await page.$eval('.js-countdown', (e) => e.textContent);
    assert.notEqual(later, first, 'the countdown is not ticking');

    // Once the start passes it must stop counting down to a time gone by.
    await page.clock.install({ time: new Date(+new Date(iso) + 60_000) });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.clock.runFor(1500);
    const now = await page.$eval('.js-countdown', (e) => e.textContent);
    assert.doesNotMatch(now, /-/, `countdown went negative: "${now}"`);
    assert.ok(now.trim().length > 0, 'the countdown emptied itself at the start');
    await page.close();
  });

  test('join links appear near the start and not before', async () => {
    const page = await browser.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    const el = await page.$('.js-live[data-iso]');
    if (!el) { await page.close(); return; }
    const iso = await el.getAttribute('data-iso');

    for (const [offsetMs, shown, when] of [
      [-24 * 3600_000, false, 'a day before'],
      [-30 * 60_000, true, 'half an hour before'],
      [30 * 60_000, true, 'half an hour in'],
      [6 * 3600_000, false, 'six hours after'],
    ]) {
      await page.clock.install({ time: new Date(+new Date(iso) + offsetMs) });
      await page.goto(base + '/', { waitUntil: 'load' });
      await page.clock.runFor(1000);
      assert.equal(await visible(page, '.js-live') > 0, shown, `join links ${when} the start`);
    }
    await page.close();
  });
});

describe('progressive enhancement', () => {
  test('carousels scroll', async (t) => {
    // Needs a carousel with more cards than fit; a two-card row is legitimately
    // not scrollable, and asserting on one tests nothing.
    const page = await browser.newPage();
    const candidates = [
      '/facilitating-archdes/legacy-system-modernization-empathy/',
      '/facilitating-archdes/architectural-indecision/',
      '/heuristics/a-decision-is-what-gets-implemented/',
      '/',
    ];
    for (const path of candidates) {
      await page.goto(base + path, { waitUntil: 'load' });
      await page.waitForTimeout(300);
      const scrollable = await page.$$eval('.carousel', (els) =>
        els.some((el) => el.scrollWidth > el.clientWidth + 6));
      if (!scrollable) continue;

      const before = await page.$eval('.carousel', (el) => el.scrollLeft);
      await page.click('.carousel-next');
      await page.waitForTimeout(900);
      const after = await page.$eval('.carousel', (el) => el.scrollLeft);
      assert.ok(after > before, `the next arrow did not scroll the carousel on ${path}`);
      await page.close();
      return;
    }
    await page.close();
    t.skip('no scrollable carousel in the sample');
  });

  test('content is readable with JavaScript disabled', async () => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const p of ['/', '/sessions/', '/heuristics/', '/facilitating-archdes/']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      const cards = await page.$$eval('[data-test="card"]', (els) => els.filter((e) => !e.hidden).length);
      assert.ok(cards > 0, `${p} shows nothing without JS`);
    }
    await ctx.close();
  });

  test('the whole navigation is reachable on a phone without JavaScript', async () => {
    // It was not: the hamburger needs a script, so all seven links were
    // unreachable at 390px with scripting off. The nav now ships open and the
    // script collapses it, which is the same shape as every other enhancement
    // here.
    for (const js of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, javaScriptEnabled: js });
      const page = await ctx.newPage();
      await page.goto(base + '/', { waitUntil: js ? 'load' : 'domcontentloaded' });
      const shown = await visible(page, '[data-test="nav"] a');
      const total = await page.$$eval('[data-test="nav"] a', (els) => els.length);
      assert.ok(total >= 5, `expected a full nav, found ${total} links`);
      if (js) {
        assert.equal(shown, 0, 'with JS the nav should start collapsed behind the hamburger');
      } else {
        assert.equal(shown, total, `without JS only ${shown} of ${total} nav links are reachable`);
      }
      await ctx.close();
    }
  });
});

describe('accessibility basics', () => {
  test('images have alt attributes and controls have accessible names', async () => {
    const page = await browser.newPage();
    const problems = [];
    for (const p of ['/', '/sessions/', '/heuristics/', '/organisers/', '/podcasts/']) {
      await page.goto(base + p, { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate(() => ({
        noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
        namelessButtons: [...document.querySelectorAll('button')]
          .filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label')).length,
        namelessLinks: [...document.querySelectorAll('a')]
          .filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length,
      }));
      if (r.noAlt) problems.push(`${p}: ${r.noAlt} img without alt`);
      if (r.namelessButtons) problems.push(`${p}: ${r.namelessButtons} button without a name`);
      if (r.namelessLinks) problems.push(`${p}: ${r.namelessLinks} link without a name`);
    }
    await page.close();
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  test('keyboard focus is visible on the controls', async () => {
    // The filter inputs used to carry `outline: none`, and nothing defined a
    // replacement — so on a near-black canvas a keyboard visitor could not see
    // where they were.
    const page = await browser.newPage();
    await page.goto(`${base}/sessions/`, { waitUntil: 'networkidle' });
    const ring = async (selector) => {
      await page.focus(selector);
      return page.$eval(selector, (el) => {
        const s = getComputedStyle(el);
        return { width: parseFloat(s.outlineWidth) || 0, style: s.outlineStyle };
      });
    };
    for (const sel of ['[data-test="filter-search"]', '[data-test="filter-tag"]', '[data-test="filter-reset"]']) {
      const r = await ring(sel);
      assert.ok(r.width >= 2 && r.style !== 'none', `${sel} has no visible focus ring (${JSON.stringify(r)})`);
    }
    await page.close();
  });

  test('the mobile menu opens', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.isVisible('[data-test="nav"] a'), false, 'nav should start collapsed on mobile');
    await page.click('[data-test="nav-toggle"]');
    await page.waitForTimeout(200);
    assert.equal(await page.isVisible('[data-test="nav"] a'), true, 'the hamburger did not open the nav');
    await ctx.close();
  });
});
